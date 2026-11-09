package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/**
 * Lado de la actividad de los avisos diarios: guarda los ajustes que manda la web, pide el
 * permiso de notificaciones (Android 13+) y avisa a la web ([alCambiar]) con el
 * `NotificationSettings` del contrato. Se usa desde el hilo principal salvo [ajustesJson].
 *
 * Hay que crearlo al construir la actividad (registra un ActivityResultLauncher) y llamar a
 * [iniciar] en onCreate.
 */
class ControlAvisos(
    private val actividad: ComponentActivity,
    private val alCambiar: (ajustesJson: String) -> Unit,
) {
    /** Último `NotificationSettings`, para getNotificationSettings() desde el hilo del WebView. */
    @Volatile
    var ajustesJson: String = aJson(activados = true, hora = 9, minuto = 0, permiso = false)
        private set

    // testNotification() sin permiso: se publica en cuanto el usuario lo conceda.
    private var probarAlConceder = false

    private val pedirPermiso = actividad.registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { concedido ->
        if (concedido && probarAlConceder) Notificador.probar(actividad)
        probarAlConceder = false
        publicar(siempre = true)
    }

    fun iniciar() {
        Notificador.crearCanal(actividad)
        ProgramadorAvisos.programar(actividad)
        ajustesJson = calcular()
    }

    /** Primer arranque en Android 13+: pide el permiso una sola vez (los avisos vienen activados). */
    fun pedirPermisoInicial() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (AjustesAvisos.permisoPedido(actividad) || Notificador.tienePermiso(actividad)) return
        if (!AjustesAvisos.activados(actividad)) return
        AjustesAvisos.marcarPermisoPedido(actividad)
        pedirPermiso.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    fun activar(activados: Boolean) {
        AjustesAvisos.guardarActivados(actividad, activados)
        ProgramadorAvisos.programar(actividad)
        publicar(siempre = true)
        if (activados) conseguirPermiso()
    }

    fun cambiarHora(hora: Int, minuto: Int) {
        AjustesAvisos.guardarHora(actividad, hora, minuto)
        ProgramadorAvisos.programar(actividad)
        publicar(siempre = true)
    }

    fun probar() {
        if (Notificador.puedeNotificar(actividad)) {
            Notificador.probar(actividad)
        } else {
            probarAlConceder = true
            conseguirPermiso()
        }
    }

    /** En onResume: el usuario puede haber cambiado el permiso en los ajustes de Android. */
    fun refrescar() {
        if (probarAlConceder) {
            if (Notificador.puedeNotificar(actividad)) Notificador.probar(actividad)
            probarAlConceder = false
        }
        publicar(siempre = false)
    }

    /**
     * Pide el permiso con el diálogo de Android o, si Android ya no lo muestra (denegado dos
     * veces) o lo que falla es otra cosa (notificaciones o canal desactivados), abre los
     * ajustes de notificaciones de la app.
     */
    private fun conseguirPermiso() {
        if (Notificador.puedeNotificar(actividad)) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !Notificador.tienePermiso(actividad) &&
            (!AjustesAvisos.permisoPedido(actividad) ||
                actividad.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS))
        ) {
            AjustesAvisos.marcarPermisoPedido(actividad)
            pedirPermiso.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            abrirAjustes()
        }
    }

    private fun abrirAjustes() {
        val soloCanal = Notificador.tienePermiso(actividad) &&
            NotificationManagerCompat.from(actividad).areNotificationsEnabled() &&
            Notificador.canalBloqueado(actividad)
        val intent = if (soloCanal) {
            Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_CHANNEL_ID, Notificador.CANAL)
        } else {
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        }.putExtra(Settings.EXTRA_APP_PACKAGE, actividad.packageName)
        try {
            actividad.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            probarAlConceder = false
        }
    }

    private fun publicar(siempre: Boolean) {
        val nuevo = calcular()
        val cambia = nuevo != ajustesJson
        ajustesJson = nuevo
        if (siempre || cambia) alCambiar(nuevo)
    }

    private fun calcular(): String = aJson(
        activados = AjustesAvisos.activados(actividad),
        hora = AjustesAvisos.hora(actividad),
        minuto = AjustesAvisos.minuto(actividad),
        permiso = Notificador.puedeNotificar(actividad),
    )

    private fun aJson(activados: Boolean, hora: Int, minuto: Int, permiso: Boolean): String =
        JSONObject()
            .put("enabled", activados)
            .put("hour", hora)
            .put("minute", minuto)
            .put("permissionGranted", permiso)
            .toString()
}
