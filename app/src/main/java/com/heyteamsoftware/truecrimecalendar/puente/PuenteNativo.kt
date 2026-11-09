package com.heyteamsoftware.truecrimecalendar.puente

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import com.heyteamsoftware.truecrimecalendar.audio.AjustesAudio
import com.heyteamsoftware.truecrimecalendar.audio.ConexionAudio
import com.heyteamsoftware.truecrimecalendar.audio.EstadoAudio
import com.heyteamsoftware.truecrimecalendar.notificaciones.AlmacenCasos
import com.heyteamsoftware.truecrimecalendar.notificaciones.ControlAvisos

/**
 * Objeto `window.TCCNative` (sección 4.1 del contrato).
 *
 * WebView llama a estos métodos desde su propio hilo: lo que toca el reproductor o la interfaz
 * se pasa al hilo principal y los getters devuelven el último estado en caché. Los números
 * llegan como Double (los de JavaScript) y algunos métodos aceptan menos argumentos, porque
 * WebView elige el método por nombre y número de argumentos.
 */
class PuenteNativo(
    context: Context,
    private val audio: ConexionAudio,
    private val avisos: ControlAvisos,
) {
    private val app = context.applicationContext
    private val principal = Handler(Looper.getMainLooper())

    private fun enPrincipal(accion: () -> Unit) {
        principal.post(accion)
    }

    // --- Podcast ---

    @JavascriptInterface
    fun play(id: String?, titulo: String?, subtitulo: String?) {
        val caso = id?.takeIf(AbrirApp::idValido) ?: return
        enPrincipal { audio.reproducir(caso, titulo.orEmpty(), subtitulo.orEmpty()) }
    }

    @JavascriptInterface
    fun play(id: String?, titulo: String?) = play(id, titulo, null)

    @JavascriptInterface
    fun play(id: String?) = play(id, null, null)

    @JavascriptInterface
    fun pause() = enPrincipal { audio.pausar() }

    @JavascriptInterface
    fun resume() = enPrincipal { audio.reanudar() }

    @JavascriptInterface
    fun stop() = enPrincipal { audio.detener() }

    @JavascriptInterface
    fun seekTo(ms: Double) {
        if (!ms.isFinite()) return
        enPrincipal { audio.saltarA(ms.toLong()) }
    }

    @JavascriptInterface
    fun seekBy(deltaMs: Double) {
        if (!deltaMs.isFinite()) return
        enPrincipal { audio.saltarRelativo(deltaMs.toLong()) }
    }

    @JavascriptInterface
    fun getPlayerState(): String = EstadoAudio.ultimoJson

    /** Volumen de las cintas, de 0 a 1. */
    @JavascriptInterface
    fun setTapeVolume(volume: Double) {
        if (!volume.isFinite()) return
        val v = volume.toFloat().coerceIn(0f, 1f)
        enPrincipal { audio.cambiarVolumen(v) }
    }

    @JavascriptInterface
    fun getTapeVolume(): Double = AjustesAudio.volumen(app).toDouble()

    // --- Avisos diarios ---

    /** Se guarda aquí mismo: SharedPreferences admite cualquier hilo y no toca la interfaz. */
    @JavascriptInterface
    fun setCases(json: String?) {
        if (json != null) AlmacenCasos.guardar(app, json)
    }

    @JavascriptInterface
    fun getNotificationSettings(): String = avisos.ajustesJson

    @JavascriptInterface
    fun setNotificationsEnabled(enabled: Boolean) = enPrincipal { avisos.activar(enabled) }

    @JavascriptInterface
    fun setNotificationTime(hour: Double, minute: Double) {
        if (!hour.isFinite() || !minute.isFinite()) return
        val h = hour.toInt()
        val m = minute.toInt()
        if (h !in 0..23 || m !in 0..59) return
        enPrincipal { avisos.cambiarHora(h, m) }
    }

    @JavascriptInterface
    fun testNotification() = enPrincipal { avisos.probar() }

    /** Abre la ficha de la app en los ajustes de Android (en Xiaomi, ahí está «Inicio automático»). */
    @JavascriptInterface
    fun openAppSettings() = enPrincipal { avisos.abrirAjustesApp() }
}
