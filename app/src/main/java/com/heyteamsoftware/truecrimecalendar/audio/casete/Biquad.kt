package com.heyteamsoftware.truecrimecalendar.audio.casete

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sinh

/**
 * Coeficientes de un filtro biquad (fórmulas RBJ del «Audio EQ Cookbook», las mismas que usan
 * los filtros `highpass`, `lowpass` y `equalizer` de ffmpeg), ya divididos por a0.
 */
internal class Biquad(
    val b0: Double,
    val b1: Double,
    val b2: Double,
    val a1: Double,
    val a2: Double,
) {

    /** Ganancia (lineal) del filtro en [frecuencia] Hz con una frecuencia de muestreo [fs]. Para los tests. */
    fun respuesta(fs: Double, frecuencia: Double): Double {
        val w = 2 * PI * frecuencia / fs
        // H(e^jw) = (b0 + b1 e^-jw + b2 e^-2jw) / (1 + a1 e^-jw + a2 e^-2jw)
        val numRe = b0 + b1 * cos(w) + b2 * cos(2 * w)
        val numIm = -(b1 * sin(w) + b2 * sin(2 * w))
        val denRe = 1 + a1 * cos(w) + a2 * cos(2 * w)
        val denIm = -(a1 * sin(w) + a2 * sin(2 * w))
        return hypot(numRe, numIm) / hypot(denRe, denIm)
    }

    companion object {
        /** Q de un filtro de 2 polos Butterworth (el valor por defecto de ffmpeg). */
        const val Q_BUTTERWORTH = 0.7071067811865476

        fun pasoAlto(fs: Double, frecuencia: Double, q: Double = Q_BUTTERWORTH): Biquad {
            val w0 = 2 * PI * limitar(fs, frecuencia) / fs
            val alfa = sin(w0) / (2 * q)
            val c = cos(w0)
            return normalizar((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + alfa, -2 * c, 1 - alfa)
        }

        fun pasoBajo(fs: Double, frecuencia: Double, q: Double = Q_BUTTERWORTH): Biquad {
            val w0 = 2 * PI * limitar(fs, frecuencia) / fs
            val alfa = sin(w0) / (2 * q)
            val c = cos(w0)
            return normalizar((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + alfa, -2 * c, 1 - alfa)
        }

        /** Ecualizador de pico de [gananciaDb] dB con un ancho de [octavas] (como `equalizer=t=o` de ffmpeg). */
        fun pico(fs: Double, frecuencia: Double, gananciaDb: Double, octavas: Double): Biquad {
            val w0 = 2 * PI * limitar(fs, frecuencia) / fs
            val alfa = sin(w0) * sinh(ln(2.0) / 2 * octavas * w0 / sin(w0))
            val a = 10.0.pow(gananciaDb / 40)
            val c = cos(w0)
            return normalizar(1 + alfa * a, -2 * c, 1 - alfa * a, 1 + alfa / a, -2 * c, 1 - alfa / a)
        }

        /** Con frecuencias de muestreo bajas, el corte no puede pasar de Nyquist. */
        private fun limitar(fs: Double, frecuencia: Double) = frecuencia.coerceIn(1.0, fs * 0.45)

        private fun normalizar(b0: Double, b1: Double, b2: Double, a0: Double, a1: Double, a2: Double) =
            Biquad(b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0)
    }
}

/**
 * Varios biquads en serie con su estado (forma directa transpuesta II, en doble precisión).
 * Un objeto por canal: no se comparte el estado.
 */
internal class CadenaBiquad(private val etapas: Array<Biquad>) {

    private val z = DoubleArray(etapas.size * 2)

    fun procesar(entrada: Double): Double {
        var x = entrada
        for (i in etapas.indices) {
            val e = etapas[i]
            val j = 2 * i
            val y = e.b0 * x + z[j]
            var z1 = e.b1 * x - e.a1 * y + z[j + 1]
            var z2 = e.b2 * x - e.a2 * y
            // Tras un silencio el estado tiende a números desnormalizados, que son muy lentos.
            if (abs(z1) < DESNORMAL) z1 = 0.0
            if (abs(z2) < DESNORMAL) z2 = 0.0
            z[j] = z1
            z[j + 1] = z2
            x = y
        }
        return x
    }

    fun reiniciar() = z.fill(0.0)

    /** Ganancia total en [frecuencia] Hz (producto de las etapas). Para los tests. */
    fun respuesta(fs: Double, frecuencia: Double): Double =
        etapas.fold(1.0) { total, e -> total * e.respuesta(fs, frecuencia) }

    private companion object {
        const val DESNORMAL = 1e-30
    }
}
