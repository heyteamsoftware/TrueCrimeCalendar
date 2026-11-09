package com.heyteamsoftware.truecrimecalendar.audio

import androidx.media3.common.C
import androidx.media3.common.Player
import org.json.JSONObject

/** `PlayerState` del contrato: lo que la web recibe sobre el audio. */
data class EstadoAudio(
    val id: String?,
    val titulo: String?,
    val subtitulo: String?,
    val playing: Boolean,
    val buffering: Boolean,
    val ended: Boolean,
    val positionMs: Long,
    val durationMs: Long,
) {

    fun aJson(): String = JSONObject()
        .put("id", id ?: JSONObject.NULL)
        .put("titulo", titulo ?: JSONObject.NULL)
        .put("subtitulo", subtitulo ?: JSONObject.NULL)
        .put("playing", playing)
        .put("buffering", buffering)
        .put("ended", ended)
        .put("positionMs", positionMs)
        .put("durationMs", durationMs)
        .toString()

    companion object {
        val VACIO = EstadoAudio(null, null, null, false, false, false, 0, 0)

        /**
         * Último estado conocido en todo el proceso. Lo actualizan el servicio y la actividad
         * desde el hilo principal; getPlayerState() lo lee desde el hilo del WebView. Así una
         * actividad recreada mientras suena el audio lo recupera sin esperar a conectarse.
         */
        @Volatile
        var ultimoJson: String = VACIO.aJson()

        fun de(player: Player): EstadoAudio {
            val item = player.currentMediaItem ?: return VACIO
            val estado = player.playbackState
            val terminado = estado == Player.STATE_ENDED
            val duracion = player.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: 0L
            val posicion = when {
                terminado && duracion > 0 -> duracion
                duracion > 0 -> player.currentPosition.coerceIn(0L, duracion)
                else -> player.currentPosition.coerceAtLeast(0L)
            }
            return EstadoAudio(
                id = item.mediaId,
                titulo = item.mediaMetadata.title?.toString(),
                subtitulo = item.mediaMetadata.subtitle?.toString(),
                // «Sonando» = el botón debería mostrar Pausa (también mientras carga).
                playing = player.playWhenReady &&
                    estado != Player.STATE_IDLE && !terminado &&
                    player.playbackSuppressionReason == Player.PLAYBACK_SUPPRESSION_REASON_NONE,
                buffering = estado == Player.STATE_BUFFERING,
                ended = terminado,
                positionMs = posicion,
                durationMs = duracion,
            )
        }
    }
}
