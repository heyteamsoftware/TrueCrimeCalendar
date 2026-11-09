package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
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
    var ajustesJson: String = aJson(activados = false, hora = 9, minuto = 0, permiso = false)
        private set

    // testNotification() sin permiso: se publica en cuanto el usuario lo conceda.
    private var probarAlConceder = false

    // El usuario ha pulsado «Sí» sin permiso: los avisos se activan solo si lo concede.
    private var activarAlConceder = false

    private val pedirPermiso = actividad.registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { concedido ->
        if (concedido && activarAlConceder) guardarYProgramar(true)
        if (concedido && probarAlConceder) Notificador.probar(actividad)
        activarAlConceder = false
        probarAlConceder = false
        publicar(siempre = true)
    }

    fun iniciar() {
        Notificador.crearCanal(actividad)
        ProgramadorAvisos.programar(actividad)
        ajustesJson = calcular()
    }

    /**
     * Activar desde la ficha de ajustes es donde se pide el permiso (Android 13+): los avisos
     * quedan activados solo si se concede; si se deniega, siguen desactivados.
     */
    fun activar(activados: Boolean) {
        if (activados && !Notificador.puedeNotificar(actividad)) {
            activarAlConceder = true
            conseguirPermiso()
            publicar(siempre = true)
            return
        }
        activarAlConceder = false
        guardarYProgramar(activados)
        publicar(siempre = true)
    }

    private fun guardarYProgramar(activados: Boolean) {
        AjustesAvisos.guardarActivados(actividad, activados)
        ProgramadorAvisos.programar(actividad)
    }

    /** Ficha de la app en los ajustes de Android (en Xiaomi/POCO incluye «Inicio automático»). */
    fun abrirAjustesApp() {
        try {
            actividad.startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", actividad.packageName, null))
            )
        } catch (_: ActivityNotFoundException) {
            // Sin pantalla de ajustes: no se hace nada.
        }
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
        // Vuelta de los ajustes de Android tras pulsar «Sí» o «Probar aviso» sin permiso.
        if (activarAlConceder) {
            if (Notificador.puedeNotificar(actividad)) guardarYProgramar(true)
            activarAlConceder = false
        }
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
            .put("xiaomi", ES_XIAOMI)
            .toString()

    private companion object {
        // Xiaomi, Redmi y POCO bloquean las alarmas si la app no tiene «Inicio automático».
        val ES_XIAOMI = listOf(Build.MANUFACTURER, Build.BRAND).any {
            it.lowercase() in setOf("xiaomi", "redmi", "poco")
        }
    }
}
