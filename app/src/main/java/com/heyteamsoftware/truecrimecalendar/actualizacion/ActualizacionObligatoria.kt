package com.heyteamsoftware.truecrimecalendar.actualizacion

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult
import androidx.core.content.pm.PackageInfoCompat
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import com.heyteamsoftware.truecrimecalendar.R
import com.heyteamsoftware.truecrimecalendar.audio.AlmacenCintas
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Obliga a usar la última versión publicada (docs/CONTRATO.md 7.8): las cintas del servidor y los
 * guiones de la app tienen que corresponderse, así que una versión antigua no debe seguir abierta.
 *
 *  1. Play (actualización inmediata): si Google Play conoce una versión nueva, abre su pantalla de
 *     actualización a pantalla completa, y no se puede seguir sin actualizar.
 *  2. Respaldo con el servidor: `version-minima.json` dice cuál es el `versionCode` mínimo. Si esta
 *     app es más antigua, un aviso sin salida lleva a la ficha de Play. Así se puede forzar justo
 *     cuando se cambia contenido en el servidor, sin esperar a que Play avise.
 *
 * Si no hay conexión o falla la consulta, la app se abre con normalidad (nunca bloquea por un error).
 */
class ActualizacionObligatoria(private val actividad: ComponentActivity) {

    // Perezoso: la actividad aún no tiene contexto cuando se construye esta clase.
    private val manager: AppUpdateManager by lazy { AppUpdateManagerFactory.create(actividad) }
    private var aviso: AlertDialog? = null
    private var playEnCurso = false
    private var ultimaConsulta = 0L

    private val lanzador = actividad.registerForActivityResult(StartIntentSenderForResult()) { resultado ->
        playEnCurso = false
        // Cancelada o fallida: sin actualizar no se sigue (se puede reintentar o salir).
        if (resultado.resultCode != Activity.RESULT_OK) mostrarAviso()
    }

    /** Se llama en onResume: la comprobación es barata y la del servidor se limita a una cada pocos minutos. */
    fun comprobar() {
        comprobarPlay()
        val ahora = SystemClock.elapsedRealtime()
        if (ultimaConsulta == 0L || ahora - ultimaConsulta > INTERVALO_MS) {
            ultimaConsulta = ahora
            comprobarServidor()
        }
    }

    private fun comprobarPlay() {
        manager.appUpdateInfo.addOnSuccessListener { info ->
            val enCurso = info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
            val nueva = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
            if ((enCurso || nueva) && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) lanzarPlay(info)
        } // Sin Play (instalada a mano, emulador sin Google…): la consulta falla y no pasa nada.
    }

    private fun lanzarPlay(info: AppUpdateInfo) {
        if (playEnCurso || actividad.isFinishing || actividad.isDestroyed) return
        playEnCurso = true
        try {
            manager.startUpdateFlowForResult(info, lanzador, AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build())
        } catch (_: Exception) {
            playEnCurso = false
        }
    }

    private fun comprobarServidor() {
        Thread {
            val minimo = try {
                val c = URL(MINIMA_URL + "?t=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
                c.connectTimeout = 5000
                c.readTimeout = 5000
                c.useCaches = false
                try {
                    if (c.responseCode == 200) JSONObject(c.inputStream.bufferedReader().readText()).optLong("minVersionCode", 0L) else 0L
                } finally {
                    c.disconnect()
                }
            } catch (_: Exception) {
                0L
            }
            val actual = try {
                PackageInfoCompat.getLongVersionCode(actividad.packageManager.getPackageInfo(actividad.packageName, 0))
            } catch (_: Exception) {
                Long.MAX_VALUE
            }
            actividad.runOnUiThread {
                if (actividad.isFinishing || actividad.isDestroyed) return@runOnUiThread
                if (minimo > actual) mostrarAviso() else aviso?.dismiss()
            }
        }.start()
    }

    /** Aviso sin salida: «Actualizar» (ficha de Play) o «Salir». Atrás y tocar fuera no lo cierran. */
    private fun mostrarAviso() {
        if (aviso?.isShowing == true || actividad.isFinishing || actividad.isDestroyed) return
        val d = AlertDialog.Builder(actividad, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle(R.string.actualizar_titulo)
            .setMessage(R.string.actualizar_mensaje)
            .setCancelable(false)
            .setPositiveButton(R.string.actualizar_boton, null)
            .setNegativeButton(R.string.actualizar_salir) { _, _ -> actividad.finishAffinity() }
            .create()
        d.show()
        // Sin este ajuste el diálogo se cerraría al pulsar «Actualizar» y la app quedaría usable.
        d.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener { abrirTienda() }
        aviso = d
    }

    private fun abrirTienda() {
        val pkg = actividad.packageName
        try {
            actividad.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$pkg")))
        } catch (_: ActivityNotFoundException) {
            try {
                actividad.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$pkg")))
            } catch (_: ActivityNotFoundException) {
                // Sin Play ni navegador: no hay nada que hacer.
            }
        }
    }

    private companion object {
        const val MINIMA_URL = AlmacenCintas.SERVIDOR + "version-minima.json"
        const val INTERVALO_MS = 5 * 60 * 1000L
    }
}
