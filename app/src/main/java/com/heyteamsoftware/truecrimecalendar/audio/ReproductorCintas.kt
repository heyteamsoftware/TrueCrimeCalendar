package com.heyteamsoftware.truecrimecalendar.audio

import androidx.annotation.OptIn
import androidx.media3.common.ForwardingSimpleBasePlayer
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/**
 * El ExoPlayer tal como lo ve la MediaSession (notificación, pantalla de bloqueo, auriculares y
 * la actividad). La lista real lleva los sonidos de la grabadora entre cinta y cinta; aquí:
 *
 * - «Anterior» y «siguiente» cambian de cinta ([ListaCintas]), no de elemento de la lista. Solo
 *   están disponibles en los casos de varias cintas («siguiente», si queda alguna por delante).
 * - −15 s, +30 s y los saltos actúan dentro de la cinta en curso; si está sonando la grabadora,
 *   mueven el punto en el que entrará la cinta.
 *
 * Todo lo demás pasa tal cual al ExoPlayer.
 */
@OptIn(UnstableApi::class)
internal class ReproductorCintas(
    private val exo: ExoPlayer,
    private val lista: ListaCintas,
) : ForwardingSimpleBasePlayer(exo) {

    override fun getState(): State {
        val estado = super.getState()
        val cintas = lista.numeroCintas()
        val comandos = estado.availableCommands.buildUpon()
            .removeAll(*COMANDOS_CINTA)
            .addIf(Player.COMMAND_SEEK_TO_PREVIOUS, cintas > 1)
            .addIf(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM, cintas > 1)
            .addIf(Player.COMMAND_SEEK_TO_NEXT, cintas > 1 && lista.haySiguiente())
            .addIf(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM, cintas > 1 && lista.haySiguiente())
            .build()
        return estado.buildUpon().setAvailableCommands(comandos).build()
    }

    override fun handleSeek(mediaItemIndex: Int, positionMs: Long, seekCommand: Int): ListenableFuture<*> {
        val caso = lista.numeroCintas() > 0
        when {
            seekCommand == Player.COMMAND_SEEK_TO_NEXT || seekCommand == Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM ->
                lista.siguiente()
            seekCommand == Player.COMMAND_SEEK_TO_PREVIOUS || seekCommand == Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM ->
                lista.anterior()
            caso && seekCommand == Player.COMMAND_SEEK_BACK -> lista.saltarRelativo(-exo.seekBackIncrement)
            caso && seekCommand == Player.COMMAND_SEEK_FORWARD -> lista.saltarRelativo(exo.seekForwardIncrement)
            caso && seekCommand == Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM -> lista.saltarA(positionMs)
            else -> return super.handleSeek(mediaItemIndex, positionMs, seekCommand)
        }
        return Futures.immediateVoidFuture()
    }

    private companion object {
        val COMANDOS_CINTA = intArrayOf(
            Player.COMMAND_SEEK_TO_PREVIOUS,
            Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
            Player.COMMAND_SEEK_TO_NEXT,
            Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
        )
    }
}
