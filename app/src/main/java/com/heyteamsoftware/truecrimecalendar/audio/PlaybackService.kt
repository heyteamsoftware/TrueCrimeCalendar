package com.heyteamsoftware.truecrimecalendar.audio

import android.content.Intent
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.CommandButton
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import com.heyteamsoftware.truecrimecalendar.R

/**
 * Servicio del podcast: reproduce assets/audio/<id>.ogg con ExoPlayer y publica una
 * MediaSession, de modo que el audio sigue con la pantalla apagada y se controla desde la
 * notificación multimedia, la pantalla de bloqueo y los auriculares.
 *
 * La actividad le habla con un MediaController (ver [ConexionAudio]) enviando solo el id,
 * el título y el subtítulo; aquí se completa cada elemento con el archivo y la carátula.
 */
@OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {

    private var sesion: MediaSession? = null
    private val caratula: ByteArray by lazy { Caratula.png(this) }

    override fun onCreate() {
        super.onCreate()

        val player = ExoPlayer.Builder(this)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
                    .build(),
                /* handleAudioFocus = */ true,
            )
            .setHandleAudioBecomingNoisy(true) // pausa al desconectar los auriculares
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .setSeekBackIncrementMs(SALTO_ATRAS_MS)
            .setSeekForwardIncrementMs(SALTO_ADELANTE_MS)
            .build()
        player.volume = AjustesAudio.volumen(this) // volumen de las cintas elegido en los ajustes
        player.addListener(Oyente(player))

        // Botones de la notificación: −15 s, reproducir/pausa, +30 s.
        val atras = CommandButton.Builder(CommandButton.ICON_SKIP_BACK_15)
            .setDisplayName(getString(R.string.podcast_retroceder))
            .setPlayerCommand(Player.COMMAND_SEEK_BACK)
            .setSlots(CommandButton.SLOT_BACK)
            .build()
        val adelante = CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD_30)
            .setDisplayName(getString(R.string.podcast_avanzar))
            .setPlayerCommand(Player.COMMAND_SEEK_FORWARD)
            .setSlots(CommandButton.SLOT_FORWARD)
            .build()

        sesion = MediaSession.Builder(this, player)
            .setCallback(Llamadas())
            .setSessionActivity(actividadPara(null))
            .setMediaButtonPreferences(listOf(atras, adelante))
            .build()

        setMediaNotificationProvider(
            DefaultMediaNotificationProvider.Builder(this)
                .setChannelId(CANAL_PODCAST)
                .setChannelName(R.string.canal_podcast)
                .build()
                .apply { setSmallIcon(R.drawable.ic_stat_tcc) }
        )
        // Sin nada que reproducir (detenido o con error) no queda notificación.
        setShowNotificationForIdlePlayer(SHOW_NOTIFICATION_FOR_IDLE_PLAYER_NEVER)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = sesion

    // Si el usuario cierra la app desde Recientes con el audio en pausa, el servicio también se va.
    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!isPlaybackOngoing) pauseAllPlayersAndStopSelf()
    }

    override fun onDestroy() {
        sesion?.run {
            player.release()
            release()
        }
        sesion = null
        EstadoAudio.ultimoJson = EstadoAudio.VACIO.aJson()
        super.onDestroy()
    }

    /** Al tocar la notificación multimedia se abre el expediente que suena. */
    private fun actividadPara(id: String?) = AbrirApp.pendiente(
        this,
        AbrirApp.PETICION_PODCAST,
        if (id != null) AbrirApp.intentCaso(this, id) else AbrirApp.intentApp(this),
    )

    /** Convierte el elemento que pide la actividad (id + textos) en uno reproducible. */
    private fun completar(pedido: MediaItem): MediaItem? {
        val id = pedido.mediaId.takeIf(AbrirApp::idValido) ?: return null
        val datos = pedido.mediaMetadata
        val subtitulo = datos.subtitle?.toString().orEmpty()
        val titulo = datos.title?.toString().orEmpty().ifBlank { subtitulo.ifBlank { getString(R.string.app_name) } }
        return MediaItem.Builder()
            .setMediaId(id)
            .setUri("asset:///audio/$id.ogg")
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(titulo)
                    .setSubtitle(subtitulo)
                    .setArtist(
                        if (subtitulo.isBlank()) getString(R.string.app_name)
                        else getString(R.string.podcast_artista, subtitulo)
                    )
                    .setAlbumTitle(getString(R.string.app_name))
                    .setArtworkData(caratula, MediaMetadata.PICTURE_TYPE_FRONT_COVER)
                    .setMediaType(MediaMetadata.MEDIA_TYPE_PODCAST_EPISODE)
                    .setIsBrowsable(false)
                    .setIsPlayable(true)
                    .build()
            )
            .build()
    }

    private inner class Llamadas : MediaSession.Callback {
        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>,
        ): ListenableFuture<MutableList<MediaItem>> =
            Futures.immediateFuture(mediaItems.mapNotNullTo(mutableListOf(), ::completar))
    }

    private inner class Oyente(private val player: ExoPlayer) : Player.Listener {

        override fun onPlaybackStateChanged(playbackState: Int) {
            // Al acabar un episodio no se pasa a otro: queda en pausa al final.
            if (playbackState == Player.STATE_ENDED) player.pause()
        }

        override fun onPlayerError(error: PlaybackException) {
            // Por ejemplo, el audio aún no existe: se descarta y el estado queda sin reproducir.
            Log.w(TAG, "No se puede reproducir ${player.currentMediaItem?.mediaId}", error)
            player.stop()
            player.clearMediaItems()
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            sesion?.setSessionActivity(actividadPara(mediaItem?.mediaId))
        }

        override fun onEvents(player: Player, events: Player.Events) {
            EstadoAudio.ultimoJson = EstadoAudio.de(player).aJson()
        }
    }

    private companion object {
        const val TAG = "PlaybackService"
        const val CANAL_PODCAST = "podcast"
        const val SALTO_ATRAS_MS = 15_000L
        const val SALTO_ADELANTE_MS = 30_000L
    }
}
