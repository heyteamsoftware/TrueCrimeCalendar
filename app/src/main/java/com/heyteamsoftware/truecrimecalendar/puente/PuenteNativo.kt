package com.heyteamsoftware.truecrimecalendar.puente

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import com.heyteamsoftware.truecrimecalendar.audio.AjustesAudio
import com.heyteamsoftware.truecrimecalendar.audio.ConexionAudio
import com.heyteamsoftware.truecrimecalendar.audio.DescargaCintasService
import com.heyteamsoftware.truecrimecalendar.audio.EstadoAudio
import com.heyteamsoftware.truecrimecalendar.notificaciones.AlmacenCasos
import com.heyteamsoftware.truecrimecalendar.notificaciones.ControlAvisos

/**
 * Objeto `window.TCCNative` (secciones 4.1, 7.4 y 7.7 del contrato).
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

    // --- Casos en cintas (versión 3, contrato 7.4) ---

    /**
     * `{"id","titulo","subtitulo","cintas":[{"n","titulo","url","durationMs"}],"desde","posMs"}`
     * (texto JSON). Lo valida el servicio de audio.
     */
    @JavascriptInterface
    fun playCase(json: String?) {
        val texto = json?.takeIf { it.isNotBlank() && it.length <= MAX_JSON_CASO } ?: return
        enPrincipal { audio.reproducirCaso(texto) }
    }

    @JavascriptInterface
    fun playTape(n: Double) {
        if (!n.isFinite() || n < 1 || n > MAX_CINTA) return
        val cinta = n.toInt()
        enPrincipal { audio.reproducirCinta(cinta) }
    }

    @JavascriptInterface
    fun nextTape() = enPrincipal { audio.siguienteCinta() }

    @JavascriptInterface
    fun prevTape() = enPrincipal { audio.anteriorCinta() }

    @JavascriptInterface
    fun pause() = enPrincipal { audio.pausar() }

    @JavascriptInterface
    fun resume() = enPrincipal { audio.reanudar() }

    @JavascriptInterface
    fun stop() = enPrincipal { audio.detener() }

    /** Expulsa la cinta: suena «stop y expulsar» y después se detiene (contrato 7.4). */
    @JavascriptInterface
    fun ejectTape() = enPrincipal { audio.expulsar() }

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

    // --- Cintas guardadas en el móvil (contrato 7.7) ---

    /** Baja del servidor todas las cintas que falten, con una notificación de avance. */
    @JavascriptInterface
    fun downloadAllTapes() = enPrincipal { DescargaCintasService.empezar(app) }

    @JavascriptInterface
    fun cancelTapeDownload() = DescargaCintasService.cancelar()

    /** Borra las copias guardadas (no hace nada con una descarga en marcha). */
    @JavascriptInterface
    fun deleteDownloadedTapes() = DescargaCintasService.borrar(app)

    /** `TapeDownloadState` en JSON. Se calcula en el hilo de WebView, no en el principal. */
    @JavascriptInterface
    fun getTapeDownloadState(): String = DescargaCintasService.estadoJson(app)

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

    private companion object {
        const val MAX_JSON_CASO = 64 * 1024
        const val MAX_CINTA = 99.0
    }
}
