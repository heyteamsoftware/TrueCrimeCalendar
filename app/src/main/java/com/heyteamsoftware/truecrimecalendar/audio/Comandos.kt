package com.heyteamsoftware.truecrimecalendar.audio

import android.os.Bundle
import androidx.media3.session.SessionCommand

/**
 * Órdenes propias que la actividad ([ConexionAudio]) envía al servicio ([PlaybackService]) por la
 * MediaSession. Solo se conceden a los controladores de esta app.
 *
 * Todas las órdenes de la web van por aquí (también pausar y detener): Media3 retiene los comandos
 * de reproductor de un controlador hasta el final de cada tanda, mientras que los propios se
 * ejecutan al llegar, así que mezclarlos podría desordenarlos (por ejemplo, `stop` y `playCase`).
 */
internal object Comandos {

    private const val PREFIJO = "com.heyteamsoftware.truecrimecalendar.audio."

    /** `play(id, titulo, subtitulo)` de la versión 2: argumentos [ARG_ID], [ARG_TITULO] y [ARG_SUBTITULO]. */
    val EPISODIO = SessionCommand(PREFIJO + "EPISODIO", Bundle.EMPTY)

    /** `playCase(json)`: argumento [ARG_JSON]. */
    val CASO = SessionCommand(PREFIJO + "CASO", Bundle.EMPTY)

    /** `playTape(n)`: argumento [ARG_NUMERO]. */
    val CINTA = SessionCommand(PREFIJO + "CINTA", Bundle.EMPTY)
    val SIGUIENTE = SessionCommand(PREFIJO + "SIGUIENTE", Bundle.EMPTY)
    val ANTERIOR = SessionCommand(PREFIJO + "ANTERIOR", Bundle.EMPTY)

    /** Reanudar (también tras acabar o tras un error). */
    val REANUDAR = SessionCommand(PREFIJO + "REANUDAR", Bundle.EMPTY)
    val PAUSAR = SessionCommand(PREFIJO + "PAUSAR", Bundle.EMPTY)

    /** Detener y quitar la notificación. */
    val DETENER = SessionCommand(PREFIJO + "DETENER", Bundle.EMPTY)

    /** `seekTo(ms)` y `seekBy(deltaMs)` dentro de la cinta en curso: argumento [ARG_MS]. */
    val SALTAR_A = SessionCommand(PREFIJO + "SALTAR_A", Bundle.EMPTY)
    val SALTAR = SessionCommand(PREFIJO + "SALTAR", Bundle.EMPTY)

    val TODOS = listOf(EPISODIO, CASO, CINTA, SIGUIENTE, ANTERIOR, REANUDAR, PAUSAR, DETENER, SALTAR_A, SALTAR)

    const val ARG_ID = "id"
    const val ARG_TITULO = "titulo"
    const val ARG_SUBTITULO = "subtitulo"
    const val ARG_JSON = "json"
    const val ARG_NUMERO = "n"
    const val ARG_MS = "ms"
}
