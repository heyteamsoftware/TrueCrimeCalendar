package com.heyteamsoftware.truecrimecalendar.audio

import android.content.Context
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.heyteamsoftware.truecrimecalendar.R
import java.io.IOException

/**
 * Casos en cintas (contrato 7.3 y 7.4) dentro del ExoPlayer del servicio.
 *
 * La lista de Media3 de un caso de n cintas tiene 2·n elementos: delante de cada cinta, el
 * sonido de la grabadora que la mete (`[S1, C1, S2, C2, …]`). Al empezar un caso, el sonido de la
 * cinta pedida es `sfx/insertar-cinta.ogg`; todos los demás, `sfx/cambio-cinta.ogg`. Así, al
 * acabar una cinta Media3 pasa solo al cambio y a la siguiente, y al acabar la última se para.
 * Para saltar a otra cinta (siguiente, anterior, `playTape`) se va al sonido que la precede.
 *
 * Cuando una cinta debe empezar a mitad («Seguir escuchando»), el punto se guarda como pendiente
 * y se aplica al entrar la cinta tras su sonido (las cintas empiezan con 0,4 s de silencio, así
 * que el salto no se oye).
 *
 * Todo se usa desde el hilo principal.
 */
@OptIn(UnstableApi::class)
internal class ListaCintas(
    private val context: Context,
    private val exo: ExoPlayer,
    private val caratula: () -> ByteArray,
) {
    // Punto en el que debe empezar la cinta del elemento [pendienteIndice] cuando entre.
    private var pendienteIndice = C.INDEX_UNSET
    private var pendienteMs = 0L

    // --- Órdenes (puente y botones de la notificación) ---

    /** `playCase(json)`. */
    fun cargar(json: String?) {
        val peticion = PeticionCaso.leer(json)
        if (peticion == null) {
            Log.w(TAG, "playCase: petición no válida")
            return
        }
        val nuevo = peticion.caso
        val i = peticion.indiceDesde
        val pista = pistaActual()
        val cargado = pista?.caso
        if (pista != null && cargado == nuevo && exo.mediaItemCount == cargado.cintas.size * 2) {
            // El caso ya está en la grabadora: no se rehace la lista.
            if (i == pista.indice && exo.playbackState != Player.STATE_ENDED) reanudar()
            else irA(cargado, i, peticion.posMs, if (i == pista.indice) TipoPista.INSERTAR else TipoPista.CAMBIO)
            return
        }
        if (!existe(nuevo.cintas[i].uri)) {
            Log.w(TAG, "Falta el audio de la cinta ${nuevo.cintas[i].n} de ${nuevo.id}: ${nuevo.cintas[i].uri}")
            return
        }
        val elementos = ArrayList<MediaItem>(nuevo.cintas.size * 2)
        for (j in nuevo.cintas.indices) {
            elementos += sonido(nuevo, j, if (j == i) TipoPista.INSERTAR else TipoPista.CAMBIO)
            elementos += cinta(nuevo, j)
        }
        fijarPendiente(nuevo, i, peticion.posMs)
        exo.setMediaItems(elementos, 2 * i, 0L)
        exo.prepare()
        exo.play()
    }

    /** `playTape(n)`: a la cinta n del caso cargado, con el cambio de cinta si estaba otra. */
    fun reproducirCinta(n: Int) {
        val pista = pistaActual() ?: return
        val caso = pista.caso ?: return
        val i = caso.indiceDe(n) ?: return
        when {
            i != pista.indice -> irA(caso, i, 0L, TipoPista.CAMBIO)
            exo.playbackState == Player.STATE_ENDED -> irA(caso, i, 0L, TipoPista.INSERTAR)
            else -> reanudar() // ya está en esa cinta (o entrando): sigue
        }
    }

    fun siguiente() {
        val pista = pistaActual() ?: return
        val caso = pista.caso ?: return
        if (pista.indice < caso.cintas.size - 1) irA(caso, pista.indice + 1, 0L, TipoPista.CAMBIO)
    }

    /** Cinta anterior; en la primera, vuelve a su principio. */
    fun anterior() {
        val pista = pistaActual() ?: return
        val caso = pista.caso ?: return
        when {
            pista.indice > 0 -> irA(caso, pista.indice - 1, 0L, TipoPista.CAMBIO)
            pista.esSonido -> fijarPendiente(caso, 0, 0L)
            else -> exo.seekTo(exo.currentMediaItemIndex, 0L)
        }
    }

    /** Episodio único v2 ya completado por el servicio. Si ya está cargado, continúa donde iba. */
    fun reproducirEpisodio(elemento: MediaItem) {
        val actual = exo.currentMediaItem
        if (actual != null && actual.mediaId == elemento.mediaId && pistaDe(actual)?.tipo == TipoPista.EPISODIO) {
            reanudar()
            return
        }
        olvidarPendiente()
        exo.setMediaItem(elemento)
        exo.prepare()
        exo.play()
    }

    fun pausar() = exo.pause()

    /** Detiene y vacía la lista: sin elementos, el servicio retira la notificación. */
    fun detener() {
        olvidarPendiente()
        exo.stop()
        exo.clearMediaItems()
    }

    fun reanudar() {
        if (exo.mediaItemCount == 0) return
        when (exo.playbackState) {
            Player.STATE_IDLE -> exo.prepare()
            Player.STATE_ENDED -> exo.seekToDefaultPosition()
            else -> Unit
        }
        exo.play()
    }

    /** Salto dentro de la cinta en curso. Si está sonando la grabadora, mueve el punto de entrada. */
    fun saltarA(ms: Long) {
        val pista = pistaActual() ?: return
        val caso = pista.caso
        if (caso != null && pista.esSonido) {
            fijarPendiente(caso, pista.indice, ms)
            return
        }
        exo.seekTo(acotar(ms, exo.duration))
    }

    fun saltarRelativo(deltaMs: Long) {
        val pista = pistaActual() ?: return
        val caso = pista.caso
        if (caso != null && pista.esSonido) {
            val base = if (pendienteIndice == exo.currentMediaItemIndex + 1) pendienteMs else 0L
            fijarPendiente(caso, pista.indice, base + deltaMs)
            return
        }
        exo.seekTo(acotar(exo.currentPosition + deltaMs, exo.duration))
    }

    // --- Avisos del reproductor (desde el Player.Listener del servicio) ---

    /** Al cambiar de elemento: si entra la cinta con un punto pendiente, se salta a él. */
    fun alCambiarElemento() {
        val indice = exo.currentMediaItemIndex
        val pista = pistaActual()
        when {
            pista?.caso == null -> olvidarPendiente()
            pista.tipo == TipoPista.CINTA -> {
                val ms = if (indice == pendienteIndice) pendienteMs else 0L
                olvidarPendiente()
                if (ms > 0) exo.seekTo(indice, ms)
            }
            // Un sonido que no lleva a la cinta pendiente (por ejemplo, el paso automático).
            indice + 1 != pendienteIndice -> olvidarPendiente()
        }
    }

    /**
     * Error al reproducir. Si falla un sonido de la grabadora, se salta a su cinta en lugar de
     * parar el caso. Devuelve true si lo ha resuelto así.
     */
    fun alFallar(): Boolean {
        val pista = pistaActual() ?: return false
        if (pista.caso == null || !pista.esSonido) return false
        val indice = exo.currentMediaItemIndex + 1
        if (indice >= exo.mediaItemCount) return false
        val ms = if (pendienteIndice == indice) pendienteMs else 0L
        olvidarPendiente()
        exo.seekTo(indice, ms)
        exo.prepare()
        exo.play()
        return true
    }

    // --- Estado ---

    /** Cuántas cintas tiene el caso cargado (0 si suena un episodio v2 o nada). */
    fun numeroCintas(): Int = pistaActual()?.caso?.cintas?.size ?: 0

    fun haySiguiente(): Boolean {
        val pista = pistaActual() ?: return false
        val caso = pista.caso ?: return false
        return pista.indice < caso.cintas.size - 1
    }

    /** `PlayerState` del contrato (4.1 y 7.4). */
    fun estado(): EstadoAudio {
        val elemento = exo.currentMediaItem ?: return EstadoAudio.VACIO
        val estado = exo.playbackState
        val terminado = estado == Player.STATE_ENDED
        val sonando = exo.playWhenReady && estado != Player.STATE_IDLE && !terminado &&
            exo.playbackSuppressionReason == Player.PLAYBACK_SUPPRESSION_REASON_NONE
        val cargando = estado == Player.STATE_BUFFERING
        val duracionExo = exo.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: 0L
        val pista = pistaDe(elemento)
        val caso = pista?.caso

        if (pista == null || caso == null) {
            // Episodio único de la versión 2.
            return EstadoAudio(
                id = pista?.casoId ?: elemento.mediaId,
                titulo = elemento.mediaMetadata.title?.toString(),
                subtitulo = elemento.mediaMetadata.subtitle?.toString(),
                playing = sonando,
                buffering = cargando,
                ended = terminado,
                positionMs = posicion(terminado, duracionExo),
                durationMs = duracionExo,
            )
        }

        val cinta = caso.cintas[pista.indice]
        val cambiando = pista.esSonido
        // Mientras suena la grabadora, las posiciones son las de la cinta que entra, a 0.
        val duracion = if (cambiando) cinta.duracionMs else duracionExo.takeIf { it > 0 } ?: cinta.duracionMs
        return EstadoAudio(
            id = caso.id,
            titulo = caso.titulo,
            subtitulo = caso.subtitulo,
            playing = sonando,
            buffering = cargando,
            ended = terminado,
            positionMs = if (cambiando) 0L else posicion(terminado, duracion),
            durationMs = duracion,
            cinta = cinta.n,
            cintas = caso.cintas.size,
            cintaTitulo = cinta.titulo,
            cambiando = cambiando,
        )
    }

    /** Id del expediente que suena (para abrirlo al tocar la notificación). */
    fun casoActual(): String? = pistaActual()?.casoId ?: exo.currentMediaItem?.mediaId

    // --- Interno ---

    private fun irA(caso: CasoCintas, i: Int, inicioMs: Long, tipoSonido: TipoPista) {
        val ranura = 2 * i
        if (tipoEn(ranura) != tipoSonido) exo.replaceMediaItem(ranura, sonido(caso, i, tipoSonido))
        fijarPendiente(caso, i, inicioMs)
        exo.seekTo(ranura, 0L)
        // Solo puede haber un «insertar»: el de la cinta por la que se empezó, y solo hasta el primer salto.
        for (j in caso.cintas.indices) {
            if (j != i && tipoEn(2 * j) == TipoPista.INSERTAR) exo.replaceMediaItem(2 * j, sonido(caso, j, TipoPista.CAMBIO))
        }
        if (exo.playbackState == Player.STATE_IDLE) exo.prepare()
        exo.play()
    }

    private fun fijarPendiente(caso: CasoCintas, i: Int, ms: Long) {
        val duracion = caso.cintas[i].duracionMs
        pendienteIndice = 2 * i + 1
        pendienteMs = if (duracion > 0) ms.coerceIn(0L, (duracion - FINAL_RESERVADO_MS).coerceAtLeast(0L))
        else ms.coerceAtLeast(0L)
    }

    private fun olvidarPendiente() {
        pendienteIndice = C.INDEX_UNSET
        pendienteMs = 0L
    }

    private fun posicion(terminado: Boolean, duracion: Long): Long = when {
        terminado && duracion > 0 -> duracion
        duracion > 0 -> exo.currentPosition.coerceIn(0L, duracion)
        else -> exo.currentPosition.coerceAtLeast(0L)
    }

    private fun acotar(ms: Long, duracion: Long): Long =
        if (duracion != C.TIME_UNSET && duracion > 0) ms.coerceIn(0L, duracion) else ms.coerceAtLeast(0L)

    private fun pistaActual(): Pista? = pistaDe(exo.currentMediaItem)

    private fun tipoEn(indice: Int): TipoPista? =
        if (indice in 0 until exo.mediaItemCount) pistaDe(exo.getMediaItemAt(indice))?.tipo else null

    private fun existe(uri: String): Boolean {
        val ruta = RutasAudio.rutaAsset(uri) ?: return true // https: se verá al reproducir
        return try {
            context.assets.open(ruta).close()
            true
        } catch (_: IOException) {
            false
        }
    }

    private fun cinta(caso: CasoCintas, i: Int): MediaItem = MediaItem.Builder()
        .setMediaId("${caso.id}#cinta-${caso.cintas[i].n}")
        .setUri(caso.cintas[i].uri)
        .setTag(Pista(TipoPista.CINTA, caso.id, caso, i))
        .setMediaMetadata(metadatos(caso, i))
        .build()

    /** Sonido de la grabadora delante de la cinta [i]: muestra en la notificación la cinta que entra. */
    private fun sonido(caso: CasoCintas, i: Int, tipo: TipoPista): MediaItem = MediaItem.Builder()
        .setMediaId("${caso.id}#sonido-${caso.cintas[i].n}")
        .setUri(if (tipo == TipoPista.INSERTAR) SONIDO_INSERTAR else SONIDO_CAMBIO)
        .setTag(Pista(tipo, caso.id, caso, i))
        .setMediaMetadata(metadatos(caso, i))
        .build()

    private fun metadatos(caso: CasoCintas, i: Int): MediaMetadata {
        val cinta = caso.cintas[i]
        val total = caso.cintas.size
        val app = context.getString(R.string.app_name)
        val titulo = if (cinta.titulo.isBlank()) context.getString(R.string.podcast_cinta_numero, cinta.n, total)
        else context.getString(R.string.podcast_cinta_titulo, cinta.n, total, cinta.titulo)
        val subtitulo = if (caso.subtitulo.isBlank()) app else context.getString(R.string.podcast_artista, caso.subtitulo)
        return MediaMetadata.Builder()
            .setTitle(titulo)
            .setSubtitle(subtitulo)
            .setArtist(subtitulo)
            .setAlbumTitle(caso.titulo.ifBlank { app })
            .setTrackNumber(cinta.n)
            .setTotalTrackCount(total)
            .setArtworkData(caratula(), MediaMetadata.PICTURE_TYPE_FRONT_COVER)
            .setMediaType(MediaMetadata.MEDIA_TYPE_PODCAST_EPISODE)
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .build()
    }

    companion object {
        private const val TAG = "ListaCintas"
        private const val SONIDO_INSERTAR = "asset:///sfx/insertar-cinta.ogg"
        private const val SONIDO_CAMBIO = "asset:///sfx/cambio-cinta.ogg"

        /** Un punto guardado en el último segundo de la cinta se retoma un poco antes (si no, acabaría al entrar). */
        private const val FINAL_RESERVADO_MS = 1_000L

        fun pistaDe(elemento: MediaItem?): Pista? = elemento?.localConfiguration?.tag as? Pista
    }
}
