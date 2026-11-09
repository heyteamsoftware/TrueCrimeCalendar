package com.heyteamsoftware.truecrimecalendar.audio.casete

import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import androidx.media3.common.audio.AudioProcessor.StreamMetadata
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import java.nio.ByteBuffer

/**
 * AudioProcessor de Media3 que pone el sonido de casete ([MotorCasete]) a lo que suena.
 *
 * Va dentro del DefaultAudioSink del ExoPlayer del servicio, así que ve todo lo que suena: las
 * cintas v3, los sonidos de la grabadora y los episodios v2. Solo las cintas v3 llevan el efecto;
 * quién lo decide es [RenderizadorCintas], que pone [efectoActivo] antes de pasar al sink cada
 * bloque de audio decodificado (en el mismo hilo de reproducción y en el mismo orden en que llegan
 * aquí). Al activarse o desactivarse se funde en 10 ms para que no haya chasquidos.
 *
 * Admite PCM de 16 bits o float, 1 o 2 canales y de 8 a 192 kHz (Opus sale a 48 kHz mono). Con
 * cualquier otro formato se queda inactivo y el audio pasa tal cual.
 */
@OptIn(UnstableApi::class)
class ProcesadorCasete(private val semilla: Long = System.nanoTime()) : BaseAudioProcessor() {

    /** Lo pone el renderizador para el bloque que va a entrar a continuación. */
    @Volatile
    var efectoActivo: Boolean = false

    private var motor: MotorCasete? = null
    private var esFloat = false
    private var canales = 1

    // Proporción de señal con efecto (0 = original, 1 = casete) y su paso por muestra al fundir.
    private var mezcla = 0f
    private var pasoMezcla = 1f
    private var recienVaciado = true

    // Memoria de trabajo: crece si llega un bloque más grande, nunca por muestra.
    private var seco = FloatArray(0)
    private var humedo = FloatArray(0)

    override fun onConfigure(inputAudioFormat: AudioFormat): AudioFormat {
        val admitido = (inputAudioFormat.encoding == C.ENCODING_PCM_16BIT ||
            inputAudioFormat.encoding == C.ENCODING_PCM_FLOAT) &&
            inputAudioFormat.channelCount in 1..2 &&
            inputAudioFormat.sampleRate in 8_000..192_000
        return if (admitido) inputAudioFormat else AudioFormat.NOT_SET
    }

    override fun onFlush(streamMetadata: StreamMetadata) {
        val formato = inputAudioFormat
        if (formato == AudioFormat.NOT_SET || outputAudioFormat == AudioFormat.NOT_SET) {
            motor = null
            return
        }
        esFloat = formato.encoding == C.ENCODING_PCM_FLOAT
        canales = formato.channelCount
        val actual = motor
        if (actual != null && actual.frecuencia == formato.sampleRate && actual.canales == canales) {
            actual.reiniciar()
        } else {
            motor = MotorCasete(formato.sampleRate, canales, semilla)
        }
        pasoMezcla = 1f / (FUNDIDO_S * formato.sampleRate).coerceAtLeast(1f)
        recienVaciado = true
    }

    override fun onReset() {
        motor = null
        seco = FloatArray(0)
        humedo = FloatArray(0)
        mezcla = 0f
        recienVaciado = true
    }

    override fun queueInput(inputBuffer: ByteBuffer) {
        val bytes = inputBuffer.remaining()
        if (bytes == 0) return
        val m = motor
        val objetivo = if (efectoActivo) 1f else 0f
        if (recienVaciado) {
            // Tras un salto o un cambio de formato no se funde: empieza ya como toca.
            mezcla = objetivo
            recienVaciado = false
        }
        val salida = replaceOutputBuffer(bytes)
        if (m == null || (mezcla == 0f && objetivo == 0f)) {
            salida.put(inputBuffer)
            salida.flip()
            return
        }
        if (mezcla == 0f) m.reiniciar() // vuelve el efecto: sin restos de la cinta anterior

        val bytesPorMuestra = if (esFloat) 4 else 2
        val muestras = bytes / bytesPorMuestra
        val frames = muestras / canales
        val usadas = frames * canales
        if (seco.size < usadas) {
            seco = FloatArray(usadas)
            humedo = FloatArray(usadas)
        }
        if (esFloat) {
            for (i in 0 until usadas) seco[i] = inputBuffer.getFloat()
        } else {
            for (i in 0 until usadas) seco[i] = inputBuffer.getShort() * (1f / 32768f)
        }
        System.arraycopy(seco, 0, humedo, 0, usadas)
        m.procesar(humedo, frames)

        var i = 0
        for (f in 0 until frames) {
            if (mezcla != objetivo) {
                mezcla = if (objetivo > mezcla) (mezcla + pasoMezcla).coerceAtMost(1f)
                else (mezcla - pasoMezcla).coerceAtLeast(0f)
            }
            for (c in 0 until canales) {
                val s = seco[i]
                val y = if (mezcla >= 1f) humedo[i] else s + (humedo[i] - s) * mezcla
                if (esFloat) {
                    salida.putFloat(y.coerceIn(-1f, 1f))
                } else {
                    salida.putShort((y * 32768f).toInt().coerceIn(-32768, 32767).toShort())
                }
                i++
            }
        }
        // Restos que no llegan a una muestra completa (no debería haberlos): pasan tal cual.
        while (inputBuffer.hasRemaining()) salida.put(inputBuffer.get())
        salida.flip()
    }

    private companion object {
        const val FUNDIDO_S = 0.010f
    }
}
