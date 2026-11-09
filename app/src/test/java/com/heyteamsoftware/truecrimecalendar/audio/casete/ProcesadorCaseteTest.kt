package com.heyteamsoftware.truecrimecalendar.audio.casete

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import androidx.media3.common.audio.AudioProcessor.StreamMetadata
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

class ProcesadorCaseteTest {

    private val mono16 = AudioFormat(48_000, 1, C.ENCODING_PCM_16BIT)

    @Test
    fun sinEfectoElAudioPasaIntacto() {
        val p = preparado(mono16)
        p.efectoActivo = false
        val entrada = tono16(4800)
        p.queueInput(entrada.duplicate())
        val salida = p.output
        assertEquals(entrada.remaining(), salida.remaining())
        assertEquals(entrada, salida)
    }

    @Test
    fun conEfectoCambiaElSonidoSinCambiarLaLongitud() {
        val p = preparado(mono16)
        p.efectoActivo = true
        val entrada = tono16(48_000)
        val consumida = entrada.duplicate()
        p.queueInput(consumida)
        assertFalse("consume toda la entrada", consumida.hasRemaining())
        val salida = p.output
        assertEquals(entrada.remaining(), salida.remaining())
        assertTrue(salida != entrada)
    }

    @Test
    fun alActivarseSeFundeSinSaltos() {
        val p = preparado(mono16)
        p.efectoActivo = false
        p.queueInput(tono16(4800))
        p.output
        p.efectoActivo = true
        val entrada = tono16(4800)
        p.queueInput(entrada)
        val salida = p.output.asShortBuffer()
        // Las primeras muestras siguen siendo casi el original (el efecto entra en 10 ms).
        val original = tono16(4800).asShortBuffer()
        assertTrue(abs(salida.get(0) - original.get(0)) < 200)
    }

    @Test
    fun floatEstereoFunciona() {
        val formato = AudioFormat(44_100, 2, C.ENCODING_PCM_FLOAT)
        val p = preparado(formato)
        p.efectoActivo = true
        val frames = 4410
        val entrada = ByteBuffer.allocateDirect(frames * 2 * 4).order(ByteOrder.nativeOrder())
        for (i in 0 until frames) {
            val v = (0.3 * sin(2 * PI * 440.0 * i / 44_100)).toFloat()
            entrada.putFloat(v).putFloat(if (i == 10) Float.NaN else v)
        }
        entrada.flip()
        p.queueInput(entrada)
        val salida = p.output.asFloatBuffer()
        assertEquals(frames * 2, salida.remaining())
        for (i in 0 until salida.remaining()) assertTrue(salida.get(i).isFinite())
    }

    @Test
    fun formatosRarosQuedanInactivos() {
        val p = ProcesadorCasete(semilla = 1)
        p.configure(AudioFormat(48_000, 6, C.ENCODING_PCM_16BIT))
        assertFalse(p.isActive)
        p.configure(AudioFormat(48_000, 1, C.ENCODING_PCM_24BIT))
        assertFalse(p.isActive)
        p.configure(mono16)
        assertTrue(p.isActive)
    }

    private fun preparado(formato: AudioFormat): ProcesadorCasete {
        val p = ProcesadorCasete(semilla = 1)
        p.configure(formato)
        p.flush(StreamMetadata.DEFAULT)
        return p
    }

    private fun tono16(frames: Int): ByteBuffer {
        val b = ByteBuffer.allocateDirect(frames * 2).order(ByteOrder.nativeOrder())
        for (i in 0 until frames) b.putShort((6000 * sin(2 * PI * 300.0 * i / 48_000)).toInt().toShort())
        b.flip()
        return b
    }
}
