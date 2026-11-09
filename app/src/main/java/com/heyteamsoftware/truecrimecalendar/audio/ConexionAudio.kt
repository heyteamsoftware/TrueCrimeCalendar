package com.heyteamsoftware.truecrimecalendar.audio

import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import java.io.IOException

/**
 * Lado de la actividad: conecta con [PlaybackService] mediante un MediaController, le pasa
 * las órdenes de la web y le devuelve el estado ([alCambiar]) en cada cambio y cada segundo
 * mientras suena. Todo se usa desde el hilo principal.
 */
class ConexionAudio(
    private val context: Context,
    private val alCambiar: (estadoJson: String) -> Unit,
) {
    private val principal = Handler(Looper.getMainLooper())
    private var futuro: ListenableFuture<MediaController>? = null
    private var controlador: MediaController? = null

    // Órdenes recibidas antes de que termine la conexión.
    private val pendientes = ArrayDeque<(MediaController) -> Unit>()

    private val tic = Runnable { publicar() }

    private val oyente = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) = publicar()
    }

    private val alDesconectar = object : MediaController.Listener {
        override fun onDisconnected(controller: MediaController) {
            // También llega tras soltarlo nosotros en desconectar(): entonces no se hace nada.
            if (controller !== controlador) return
            // El servicio se ha ido: la próxima orden vuelve a conectar.
            olvidarControlador()
            EstadoAudio.ultimoJson = EstadoAudio.VACIO.aJson()
            alCambiar(EstadoAudio.ultimoJson)
            if (pendientes.isNotEmpty()) conectar()
        }
    }

    fun conectar() {
        if (futuro != null) return
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val nuevo = MediaController.Builder(context, token).setListener(alDesconectar).buildAsync()
        futuro = nuevo
        nuevo.addListener({
            if (futuro !== nuevo) return@addListener // se desconectó antes de terminar
            val c = try {
                nuevo.get()
            } catch (e: Exception) {
                Log.w(TAG, "No se pudo conectar con el servicio de audio", e)
                futuro = null
                pendientes.clear()
                return@addListener
            }
            controlador = c
            c.addListener(oyente)
            while (pendientes.isNotEmpty()) pendientes.removeFirst()(c)
            publicar()
        }, ContextCompat.getMainExecutor(context))
    }

    fun desconectar() {
        val f = futuro ?: return
        olvidarControlador()
        MediaController.releaseFuture(f)
    }

    fun reproducir(id: String, titulo: String, subtitulo: String) {
        if (!existeAudio(id)) {
            // El coordinador aún no ha generado este audio: no se toca el reproductor.
            Log.w(TAG, "Falta assets/audio/$id.ogg")
            alCambiar(EstadoAudio.ultimoJson)
            return
        }
        enviar { c ->
            if (c.currentMediaItem?.mediaId == id) {
                reanudarEn(c) // ya está cargado: continúa donde iba
            } else {
                c.setMediaItem(
                    MediaItem.Builder()
                        .setMediaId(id)
                        .setMediaMetadata(
                            MediaMetadata.Builder().setTitle(titulo).setSubtitle(subtitulo).build()
                        )
                        .build()
                )
                c.prepare()
                c.play()
            }
        }
    }

    fun pausar() = enviar { it.pause() }

    fun reanudar() = enviar(::reanudarEn)

    /** Detiene y quita la notificación (sin elementos, el servicio la retira). */
    fun detener() = enviar {
        it.stop()
        it.clearMediaItems()
    }

    /**
     * Volumen de las cintas (0 a 1). Se guarda y, si el servicio ya está conectado, se aplica al
     * momento; si no, el servicio lo lee al crearse (así no se arranca solo por mover el volumen).
     */
    fun cambiarVolumen(volumen: Float) {
        val v = volumen.coerceIn(0f, 1f)
        AjustesAudio.guardarVolumen(context, v)
        controlador?.takeIf { it.isConnected }?.volume = v
    }

    fun saltarA(ms: Long) = enviar { it.seekTo(acotar(it, ms)) }

    fun saltarRelativo(deltaMs: Long) = enviar { it.seekTo(acotar(it, it.currentPosition + deltaMs)) }

    private fun reanudarEn(c: MediaController) {
        if (c.mediaItemCount == 0) return
        val estado = c.playbackState
        if (estado == Player.STATE_IDLE) c.prepare()
        if (estado == Player.STATE_ENDED) c.seekToDefaultPosition()
        c.play()
    }

    private fun acotar(c: MediaController, ms: Long): Long {
        val duracion = c.duration
        return if (duracion > 0) ms.coerceIn(0L, duracion) else ms.coerceAtLeast(0L)
    }

    private fun enviar(orden: (MediaController) -> Unit) {
        val c = controlador
        if (c != null && c.isConnected) {
            orden(c)
        } else {
            pendientes.addLast(orden)
            conectar()
        }
    }

    private fun publicar() {
        principal.removeCallbacks(tic)
        val c = controlador ?: return
        val estado = EstadoAudio.de(c)
        EstadoAudio.ultimoJson = estado.aJson()
        alCambiar(EstadoAudio.ultimoJson)
        if (estado.playing) principal.postDelayed(tic, INTERVALO_MS)
    }

    private fun olvidarControlador() {
        principal.removeCallbacks(tic)
        controlador?.removeListener(oyente)
        controlador = null
        futuro = null
    }

    private fun existeAudio(id: String): Boolean = try {
        context.assets.open("audio/$id.ogg").close()
        true
    } catch (_: IOException) {
        false
    }

    private companion object {
        const val TAG = "ConexionAudio"
        const val INTERVALO_MS = 1_000L
    }
}
