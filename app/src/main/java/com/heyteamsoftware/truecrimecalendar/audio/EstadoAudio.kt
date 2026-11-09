package com.heyteamsoftware.truecrimecalendar.audio

import org.json.JSONObject

/**
 * `PlayerState` del contrato (4.1 y 7.4): lo que la web recibe sobre el audio. Con un episodio
 * v2 (o sin nada cargado) los campos de las cintas valen `null`, `0`, `""` y `false`.
 */
data class EstadoAudio(
    val id: String?,
    val titulo: String?,
    val subtitulo: String?,
    val playing: Boolean,
    val buffering: Boolean,
    val ended: Boolean,
    val positionMs: Long,
    val durationMs: Long,
    val cinta: Int? = null,
    val cintas: Int = 0,
    val cintaTitulo: String = "",
    val cambiando: Boolean = false,
    /** Suena «stop y expulsar»: la cinta sale de la grabadora (al acabar el caso o al pulsar expulsar). */
    val expulsando: Boolean = false,
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
        .put("cinta", cinta ?: JSONObject.NULL)
        .put("cintas", cintas)
        .put("cintaTitulo", cintaTitulo)
        .put("cambiando", cambiando)
        .put("expulsando", expulsando)
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

        /**
         * Estado al momento, calculado por el servicio de audio (que sabe en qué cinta está y si
         * suena la grabadora). Lo pone [PlaybackService] mientras existe; solo se usa desde el
         * hilo principal (servicio y actividad están en el mismo proceso).
         */
        internal var fuente: (() -> EstadoAudio)? = null

        fun actual(): EstadoAudio = fuente?.invoke() ?: VACIO
    }
}
