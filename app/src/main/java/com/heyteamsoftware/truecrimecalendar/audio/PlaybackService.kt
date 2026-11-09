package com.heyteamsoftware.truecrimecalendar.audio

import android.content.Intent
import android.os.Bundle
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
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionError
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import com.heyteamsoftware.truecrimecalendar.R
import com.heyteamsoftware.truecrimecalendar.audio.casete.FabricaRenderizadores
import com.heyteamsoftware.truecrimecalendar.audio.casete.ProcesadorCasete

/**
 * Servicio del podcast: reproduce con ExoPlayer y publica una MediaSession, de modo que el audio
 * sigue con la pantalla apagada y se controla desde la notificación multimedia, la pantalla de
 * bloqueo y los auriculares.
 *
 * - Episodios únicos v2 (`assets/audio/<id>.ogg`): la actividad envía el id, el título y el
 *   subtítulo, y aquí se completa el elemento con el archivo y la carátula.
 * - Casos en cintas v3: la actividad envía órdenes propias ([Comandos]) que resuelve [ListaCintas].
 *
 * El audio pasa por [ProcesadorCasete], que pone el sonido de casete solo a las cintas v3 (ver
 * [FabricaRenderizadores]).
 */
@OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {

    private var sesion: MediaSession? = null
    private var lista: ListaCintas? = null
    private var botonesNotificacion: Botones? = null
    private val caratula: ByteArray by lazy { Caratula.png(this) }

    override fun onCreate() {
        super.onCreate()

        val efecto = ProcesadorCasete()
        val exo = ExoPlayer.Builder(this, FabricaRenderizadores(this, efecto) { ListaCintas.pistaDe(it)?.conEfecto == true })
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
        exo.volume = AjustesAudio.volumen(this) // volumen de las cintas elegido en los ajustes
        val cintas = ListaCintas(this, exo) { caratula }
        lista = cintas
        // Antes de crear el envoltorio: así salta al punto pendiente antes de que la sesión lo vea.
        exo.addListener(Oyente(exo, cintas))
        val reproductor = ReproductorCintas(exo, cintas)

        val botones = Botones()
        botonesNotificacion = botones

        sesion = MediaSession.Builder(this, reproductor)
            .setCallback(Llamadas())
            .setSessionActivity(actividadPara(null))
            .setMediaButtonPreferences(botones.para(cintas))
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

        EstadoAudio.fuente = cintas::estado
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = sesion

    // Si el usuario cierra la app desde Recientes con el audio en pausa, el servicio también se va.
    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!isPlaybackOngoing) pauseAllPlayersAndStopSelf()
    }

    override fun onDestroy() {
        EstadoAudio.fuente = null
        sesion?.run {
            player.release()
            release()
        }
        sesion = null
        lista = null
        EstadoAudio.ultimoJson = EstadoAudio.VACIO.aJson()
        super.onDestroy()
    }

    /** Al tocar la notificación multimedia se abre el expediente que suena. */
    private fun actividadPara(id: String?) = AbrirApp.pendiente(
        this,
        AbrirApp.PETICION_PODCAST,
        if (id != null && AbrirApp.idValido(id)) AbrirApp.intentCaso(this, id) else AbrirApp.intentApp(this),
    )

    /** Convierte el episodio v2 que pide la actividad (id + textos) en uno reproducible. */
    private fun completar(pedido: MediaItem): MediaItem? {
        val id = pedido.mediaId.takeIf(AbrirApp::idValido) ?: return null
        val datos = pedido.mediaMetadata
        val subtitulo = datos.subtitle?.toString().orEmpty()
        val titulo = datos.title?.toString().orEmpty().ifBlank { subtitulo.ifBlank { getString(R.string.app_name) } }
        return MediaItem.Builder()
            .setMediaId(id)
            .setUri("asset:///audio/$id.ogg")
            .setTag(Pista(TipoPista.EPISODIO, id, null, -1))
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

        /**
         * Comandos por defecto de Media3 (según se fíe o no del controlador) y, solo para los
         * controladores de esta app, las órdenes de las cintas. Ojo: en Media3 1.11 `onConnect` está
         * obsoleto y su implementación por defecto devuelve un resultado sin ningún comando.
         */
        override fun onConnectAsync(
            session: MediaSession,
            controller: MediaSession.ControllerInfo,
        ): ListenableFuture<MediaSession.ConnectionResult> {
            val resultado = MediaSession.ConnectionResult.AcceptedResultBuilder(session, controller)
            if (controller.packageName == packageName) {
                val comandos = MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                Comandos.TODOS.forEach(comandos::add)
                resultado.setAvailableSessionCommands(comandos.build())
            }
            return Futures.immediateFuture(resultado.build())
        }

        override fun onCustomCommand(
            session: MediaSession,
            controller: MediaSession.ControllerInfo,
            customCommand: SessionCommand,
            args: Bundle,
        ): ListenableFuture<SessionResult> {
            val cintas = lista ?: return Futures.immediateFuture(SessionResult(SessionError.ERROR_INVALID_STATE))
            when (customCommand.customAction) {
                Comandos.EPISODIO.customAction -> {
                    val pedido = MediaItem.Builder()
                        .setMediaId(args.getString(Comandos.ARG_ID).orEmpty())
                        .setMediaMetadata(
                            MediaMetadata.Builder()
                                .setTitle(args.getString(Comandos.ARG_TITULO))
                                .setSubtitle(args.getString(Comandos.ARG_SUBTITULO))
                                .build()
                        )
                        .build()
                    completar(pedido)?.let(cintas::reproducirEpisodio)
                }
                Comandos.CASO.customAction -> cintas.cargar(args.getString(Comandos.ARG_JSON))
                Comandos.CINTA.customAction -> cintas.reproducirCinta(args.getInt(Comandos.ARG_NUMERO))
                Comandos.SIGUIENTE.customAction -> cintas.siguiente()
                Comandos.ANTERIOR.customAction -> cintas.anterior()
                Comandos.REANUDAR.customAction -> cintas.reanudar()
                Comandos.PAUSAR.customAction -> cintas.pausar()
                Comandos.DETENER.customAction -> cintas.detener()
                Comandos.SALTAR_A.customAction -> cintas.saltarA(args.getLong(Comandos.ARG_MS))
                Comandos.SALTAR.customAction -> cintas.saltarRelativo(args.getLong(Comandos.ARG_MS))
                else -> return super.onCustomCommand(session, controller, customCommand, args)
            }
            return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
        }

        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>,
        ): ListenableFuture<MutableList<MediaItem>> =
            Futures.immediateFuture(mediaItems.mapNotNullTo(mutableListOf(), ::completar))
    }

    private inner class Oyente(private val player: ExoPlayer, private val cintas: ListaCintas) : Player.Listener {

        override fun onPlaybackStateChanged(playbackState: Int) {
            // Al acabar (el episodio o la última cinta) no se pasa a otro: queda en pausa al final.
            if (playbackState == Player.STATE_ENDED) player.pause()
        }

        override fun onPlayerError(error: PlaybackException) {
            // Si falla un sonido de la grabadora, se sigue con la cinta.
            if (cintas.alFallar()) {
                Log.w(TAG, "Falla un sonido de la grabadora; se sigue con la cinta", error)
                return
            }
            // Por ejemplo, el audio aún no existe: se descarta y el estado queda sin reproducir.
            Log.w(TAG, "No se puede reproducir ${player.currentMediaItem?.mediaId}", error)
            player.stop()
            player.clearMediaItems()
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            cintas.alCambiarElemento()
            sesion?.setSessionActivity(actividadPara(cintas.casoActual()))
        }

        override fun onEvents(player: Player, events: Player.Events) {
            EstadoAudio.ultimoJson = cintas.estado().aJson()
            // Botones de cinta anterior/siguiente según el caso y la cinta en curso.
            val botones = botonesNotificacion ?: return
            if (botones.cambian(cintas)) sesion?.setMediaButtonPreferences(botones.para(cintas))
        }
    }

    /**
     * Botones de la notificación multimedia y la pantalla de bloqueo: −15 s, reproducir/pausa y
     * +30 s y, en los casos de varias cintas, cinta anterior y (si queda alguna) siguiente. La
     * MediaSession de la plataforma no oculta un botón cuando el reproductor deja de admitir su
     * comando, así que la lista se cambia cuando cambia el caso o la cinta.
     */
    private inner class Botones {
        private val atras = CommandButton.Builder(CommandButton.ICON_SKIP_BACK_15)
            .setDisplayName(getString(R.string.podcast_retroceder))
            .setPlayerCommand(Player.COMMAND_SEEK_BACK)
            .setSlots(CommandButton.SLOT_BACK)
            .build()
        private val adelante = CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD_30)
            .setDisplayName(getString(R.string.podcast_avanzar))
            .setPlayerCommand(Player.COMMAND_SEEK_FORWARD)
            .setSlots(CommandButton.SLOT_FORWARD)
            .build()
        private val anterior = CommandButton.Builder(CommandButton.ICON_PREVIOUS)
            .setDisplayName(getString(R.string.podcast_cinta_anterior))
            .setPlayerCommand(Player.COMMAND_SEEK_TO_PREVIOUS)
            .setSlots(CommandButton.SLOT_OVERFLOW)
            .build()
        private val siguiente = CommandButton.Builder(CommandButton.ICON_NEXT)
            .setDisplayName(getString(R.string.podcast_cinta_siguiente))
            .setPlayerCommand(Player.COMMAND_SEEK_TO_NEXT)
            .setSlots(CommandButton.SLOT_OVERFLOW)
            .build()

        // 0: sin botones de cinta; 1: solo «anterior»; 2: «anterior» y «siguiente».
        private var actual = -1

        private fun tipo(cintas: ListaCintas): Int = when {
            cintas.numeroCintas() <= 1 -> 0
            cintas.haySiguiente() -> 2
            else -> 1
        }

        fun cambian(cintas: ListaCintas): Boolean = tipo(cintas) != actual

        fun para(cintas: ListaCintas): List<CommandButton> {
            actual = tipo(cintas)
            return when (actual) {
                0 -> listOf(atras, adelante)
                1 -> listOf(atras, adelante, anterior)
                else -> listOf(atras, adelante, anterior, siguiente)
            }
        }
    }

    private companion object {
        const val TAG = "PlaybackService"
        const val CANAL_PODCAST = "podcast"
        const val SALTO_ATRAS_MS = 15_000L
        const val SALTO_ADELANTE_MS = 30_000L
    }
}
