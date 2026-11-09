package com.heyteamsoftware.truecrimecalendar.audio.casete

import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Herramienta, no test: aplica el efecto a una cinta real para escucharla o medirla en el PC.
 * Solo corre si la variable de entorno TCC_VOZ_F32 apunta a un archivo float32 mono a 48 kHz,
 * por ejemplo:
 *
 *     ffmpeg -i app/src/main/assets/audio/dalia-negra/cinta-1.ogg -ac 1 -ar 48000 -f f32le voz.f32
 *     TCC_VOZ_F32=voz.f32 gradlew testDebugUnitTest --tests '*CalibracionCaseteTest*'
 *     ffmpeg -f f32le -ar 48000 -ac 1 -i voz.f32.casete.f32 casete.mp3
 *
 * Escribe <archivo>.casete.f32 (efecto completo) y <archivo>.cadena.f32 (solo filtros, compresor y
 * saturación, para compararlo con la cadena de ffmpeg de tools/variantes_cinta.py) y muestra niveles.
 */
class CalibracionCaseteTest {

    @Test
    fun procesarArchivo() {
        val ruta = System.getenv("TCC_VOZ_F32")
        assumeTrue("TCC_VOZ_F32 no definida", !ruta.isNullOrBlank())
        val archivo = File(ruta!!)
        val voz = leer(archivo)
        println("entrada: ${resumen(voz)}")

        val completo = voz.copyOf()
        MotorCasete(48_000, 1, semilla = 1).procesar(completo, completo.size)
        escribir(File(archivo.path + ".casete.f32"), completo)
        println("casete:  ${resumen(completo)}")

        val cadena = voz.copyOf()
        MotorCasete(48_000, 1, semilla = 1, adornos = false, wow = false).procesar(cadena, cadena.size)
        escribir(File(archivo.path + ".cadena.f32"), cadena)
        println("cadena:  ${resumen(cadena)}")
    }

    private fun leer(f: File): FloatArray {
        val b = ByteBuffer.wrap(f.readBytes()).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
        return FloatArray(b.remaining()).also { b.get(it) }
    }

    private fun escribir(f: File, x: FloatArray) {
        val b = ByteBuffer.allocate(x.size * 4).order(ByteOrder.LITTLE_ENDIAN)
        b.asFloatBuffer().put(x)
        f.writeBytes(b.array())
    }

    private fun resumen(x: FloatArray): String {
        val tam = 4800
        val bloques = (0 until x.size / tam).map { b ->
            var s = 0.0
            for (i in b * tam until (b + 1) * tam) s += x[i].toDouble() * x[i]
            sqrt(s / tam)
        }
        val maximo = bloques.max()
        val activos = bloques.filter { it > maximo * 0.1 }
        val activo = sqrt(activos.sumOf { it * it } / activos.size)
        val global = sqrt(x.sumOf { it.toDouble() * it } / x.size)
        val pico = x.maxOf { abs(it) }.toDouble()
        return "RMS voz ${db(activo)} dB, RMS total ${db(global)} dB, pico ${db(pico)} dB"
    }

    private fun db(v: Double) = "%.1f".format(20 * log10(max(v, 1e-12)))
}
