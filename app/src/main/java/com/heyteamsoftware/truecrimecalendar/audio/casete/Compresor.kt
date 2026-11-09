package com.heyteamsoftware.truecrimecalendar.audio.casete

import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.min
import kotlin.math.sqrt

/**
 * Compresor descendente con detector de envolvente RMS y rodilla suave: es una copia del
 * `acompressor` de ffmpeg (que viene del de Calf), para que suene igual que la receta de
 * referencia (`v1_casete_gastado` en tools/variantes_cinta.py).
 *
 * [ganancia] recibe el nivel de detección de cada muestra (|x|, o la media de los canales) y
 * devuelve la ganancia que hay que aplicar, ya multiplicada por la compensación.
 */
internal class Compresor(
    fs: Double,
    umbral: Double = 0.125,
    private val ratio: Double = 3.0,
    ataqueMs: Double = 6.0,
    relajacionMs: Double = 120.0,
    private val rodilla: Double = 2.82843,
    private val compensacion: Double = 2.0,
) {
    private val umbralLog = ln(umbral)
    private val rodillaIniLin = umbral / sqrt(rodilla)
    private val rodillaFinLin = umbral * sqrt(rodilla)
    private val deteccionMinima = rodillaIniLin * rodillaIniLin // en el dominio cuadrático (RMS)
    private val rodillaIni = ln(rodillaIniLin)
    private val rodillaFin = ln(rodillaFinLin)
    private val rodillaFinComprimida = (rodillaFin - umbralLog) / ratio + umbralLog
    private val ataque = min(1.0, 1.0 / (ataqueMs * fs / 4000.0))
    private val relajacion = min(1.0, 1.0 / (relajacionMs * fs / 4000.0))

    // Envolvente del cuadrado de la señal (detección RMS).
    private var envolvente = 0.0

    fun ganancia(nivel: Double): Double {
        val cuadrado = nivel * nivel
        envolvente += (cuadrado - envolvente) * (if (cuadrado > envolvente) ataque else relajacion)
        if (envolvente < 1e-30) envolvente = 0.0
        if (envolvente <= deteccionMinima) return compensacion

        val pendiente = ln(envolvente) * 0.5 // nivel RMS en logaritmo natural
        var g = (pendiente - umbralLog) / ratio + umbralLog
        if (rodilla > 1.0 && pendiente < rodillaFin) {
            g = hermite(pendiente, rodillaIni, rodillaFin, rodillaIni, rodillaFinComprimida, 1.0, 1.0 / ratio)
        }
        return exp(g - pendiente) * compensacion
    }

    fun reiniciar() {
        envolvente = 0.0
    }

    private fun hermite(x: Double, x0: Double, x1: Double, p0: Double, p1: Double, m0: Double, m1: Double): Double {
        val ancho = x1 - x0
        val t = (x - x0) / ancho
        val t2 = t * t
        val t3 = t2 * t
        val mm0 = m0 * ancho
        val mm1 = m1 * ancho
        val c2 = -3 * p0 - 2 * mm0 + 3 * p1 - mm1
        val c3 = 2 * p0 + mm0 - 2 * p1 + mm1
        return c3 * t3 + c2 * t2 + mm0 * t + p0
    }
}

/** Generador pseudoaleatorio xorshift64* sin asignaciones (java.util.Random es más lento y sincronizado). */
internal class Aleatorio(semilla: Long) {

    private var s = if (semilla == 0L) 0x2545F4914F6CDD1DL else semilla

    private fun siguiente(): Long {
        s = s xor (s ushr 12)
        s = s xor (s shl 25)
        s = s xor (s ushr 27)
        return s * 0x2545F4914F6CDD1DL
    }

    /** Uniforme en [0, 1). */
    fun uniforme(): Double = (siguiente() ushr 11) * (1.0 / (1L shl 53))

    fun uniforme(desde: Double, hasta: Double): Double = desde + (hasta - desde) * uniforme()

    /** Normal (0, 1) por Box-Muller. Solo se usa en los chasquidos, que son pocas muestras. */
    fun normal(): Double {
        val u1 = uniforme().coerceAtLeast(1e-12)
        val u2 = uniforme()
        return sqrt(-2.0 * ln(u1)) * kotlin.math.cos(2.0 * Math.PI * u2)
    }
}
