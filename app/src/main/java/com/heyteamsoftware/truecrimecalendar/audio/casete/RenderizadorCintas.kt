package com.heyteamsoftware.truecrimecalendar.audio.casete

import android.content.Context
import android.os.Handler
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.MediaItem
import androidx.media3.common.Timeline
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.Renderer
import androidx.media3.exoplayer.audio.AudioRendererEventListener
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.exoplayer.audio.MediaCodecAudioRenderer
import androidx.media3.exoplayer.mediacodec.MediaCodecAdapter
import androidx.media3.exoplayer.mediacodec.MediaCodecSelector
import androidx.media3.exoplayer.source.MediaSource
import java.nio.ByteBuffer

/**
 * Renderizador de audio que decide, bloque a bloque, si lo que entra al sink lleva el efecto de
 * casete. Cada elemento de la lista llega como un «flujo» con su desfase de tiempo propio:
 * [onStreamChanged] apunta, para ese desfase, si el elemento lo lleva (según [llevaEfecto]), y
 * [processOutputBuffer] lo aplica al [ProcesadorCasete] justo antes de entregar cada bloque al
 * sink. Como todo ocurre en el hilo de reproducción y antes de los búferes del AudioTrack, el
 * cambio cae en la frontera exacta entre una cinta y el sonido de la grabadora (no depende de
 * cuándo se oye).
 */
@OptIn(UnstableApi::class)
internal class RenderizadorCintas(
    context: Context,
    fabricaCodecs: MediaCodecAdapter.Factory,
    selector: MediaCodecSelector,
    respaldoDecodificador: Boolean,
    manejador: Handler?,
    oyente: AudioRendererEventListener?,
    sink: AudioSink,
    private val efecto: ProcesadorCasete,
    private val llevaEfecto: (MediaItem) -> Boolean,
) : MediaCodecAudioRenderer(context, fabricaCodecs, selector, respaldoDecodificador, manejador, oyente, sink) {

    // Desfase del flujo → si lleva efecto. Solo hay unos pocos flujos vivos a la vez.
    private val efectoPorFlujo = LinkedHashMap<Long, Boolean>()
    private val ventana = Timeline.Window()
    private val periodo = Timeline.Period()
    private var desfaseConsultado = Long.MIN_VALUE
    private var efectoDelFlujo = false

    override fun onStreamChanged(
        formats: Array<out Format>,
        startPositionUs: Long,
        offsetUs: Long,
        mediaPeriodId: MediaSource.MediaPeriodId,
    ) {
        super.onStreamChanged(formats, startPositionUs, offsetUs, mediaPeriodId)
        val elemento = elementoDe(mediaPeriodId)
        val conEfecto = elemento?.let(llevaEfecto) ?: false
        efectoPorFlujo.remove(offsetUs)
        efectoPorFlujo[offsetUs] = conEfecto
        desfaseConsultado = Long.MIN_VALUE
        // Una línea por elemento: permite comprobar en logcat qué suena con efecto.
        Log.d(TAG, "${elemento?.mediaId ?: "?"}: efecto de casete ${if (conEfecto) "sí" else "no"}")
        val sobrantes = efectoPorFlujo.keys.iterator()
        while (efectoPorFlujo.size > MAX_FLUJOS && sobrantes.hasNext()) {
            sobrantes.next()
            sobrantes.remove()
        }
    }

    override fun processOutputBuffer(
        positionUs: Long,
        elapsedRealtimeUs: Long,
        codec: MediaCodecAdapter?,
        buffer: ByteBuffer?,
        bufferIndex: Int,
        bufferFlags: Int,
        sampleCount: Int,
        bufferPresentationTimeUs: Long,
        isDecodeOnlyBuffer: Boolean,
        isLastBuffer: Boolean,
        format: Format,
    ): Boolean {
        // Se consulta el mapa solo cuando cambia el flujo (sin crear un Long por bloque).
        val desfase = outputStreamOffsetUs
        if (desfase != desfaseConsultado) {
            efectoDelFlujo = efectoPorFlujo[desfase] == true
            desfaseConsultado = desfase
        }
        val activo = efectoDelFlujo
        if (activo != efecto.efectoActivo) {
            efecto.efectoActivo = activo
            Log.d(TAG, "efecto ${if (activo) "activado" else "desactivado"} en ${bufferPresentationTimeUs - outputStreamOffsetUs} µs del elemento")
        }
        return super.processOutputBuffer(
            positionUs, elapsedRealtimeUs, codec, buffer, bufferIndex, bufferFlags, sampleCount,
            bufferPresentationTimeUs, isDecodeOnlyBuffer, isLastBuffer, format,
        )
    }

    override fun onReset() {
        super.onReset()
        efectoPorFlujo.clear()
        desfaseConsultado = Long.MIN_VALUE
    }

    /** Elemento de la lista al que pertenece el periodo (el renderizador recibe la línea de tiempo). */
    private fun elementoDe(id: MediaSource.MediaPeriodId): MediaItem? {
        val lineaTiempo = timeline
        if (lineaTiempo.isEmpty) return null
        val indice = lineaTiempo.getIndexOfPeriod(id.periodUid)
        if (indice == C.INDEX_UNSET) return null
        val ventanaIndice = lineaTiempo.getPeriod(indice, periodo).windowIndex
        return lineaTiempo.getWindow(ventanaIndice, ventana).mediaItem
    }

    private companion object {
        const val TAG = "EfectoCasete"
        const val MAX_FLUJOS = 8
    }
}

/**
 * Fábrica de renderizadores del servicio: el audio pasa por [RenderizadorCintas] y por un
 * DefaultAudioSink con el [ProcesadorCasete] delante. El resto, como DefaultRenderersFactory.
 */
@OptIn(UnstableApi::class)
internal class FabricaRenderizadores(
    context: Context,
    private val efecto: ProcesadorCasete,
    private val llevaEfecto: (MediaItem) -> Boolean,
) : DefaultRenderersFactory(context) {

    override fun buildAudioSink(
        context: Context,
        enableFloatOutput: Boolean,
        enableAudioOutputPlaybackParameters: Boolean,
    ): AudioSink = DefaultAudioSink.Builder(context)
        .setEnableFloatOutput(enableFloatOutput)
        .setEnableAudioOutputPlaybackParameters(enableAudioOutputPlaybackParameters)
        .setAudioProcessors(arrayOf(efecto))
        .build()

    override fun buildAudioRenderers(
        context: Context,
        extensionRendererMode: Int,
        mediaCodecSelector: MediaCodecSelector,
        enableDecoderFallback: Boolean,
        audioSink: AudioSink,
        eventHandler: Handler,
        eventListener: AudioRendererEventListener,
        out: ArrayList<Renderer>,
    ) {
        // Sin renderizadores de extensiones (la app no las incluye): solo MediaCodec, como hasta ahora.
        out.add(
            RenderizadorCintas(
                context, codecAdapterFactory, mediaCodecSelector, enableDecoderFallback,
                eventHandler, eventListener, audioSink, efecto, llevaEfecto,
            )
        )
    }
}
