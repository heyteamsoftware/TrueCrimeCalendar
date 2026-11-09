package com.heyteamsoftware.truecrimecalendar.audio.casete

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.sign
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tanh

/**
 * Efecto «casete gastado» en tiempo real (contrato, sección 7.6). Es la receta de
 * `v1_casete_gastado` (tools/variantes_cinta.py) hecha muestra a muestra:
 *
 *  1. Paso alto a 220 Hz (2 biquads), paso bajo a 5 kHz (2) y a 5,5 kHz (1).
 *  2. Pico de +5 dB en 1,5 kHz, 1,2 octavas.
 *  3. Compresor: −18 dB, 3:1, 6 ms / 120 ms, compensación ×2.
 *  4. +7 dB y recorte suave tanh con umbral 0,45.
 *  5. Wow & flutter: retardo variable (4 ms + 1,4 ms a 0,5 Hz + 2,2 ms a 0,19 Hz + 0,04 ms a 7 Hz)
 *     con interpolación lineal.
 *  6. Ganancia final fija.
 *  7. Siseo de ruido rosa (filtro de Paul Kellet) entre 900 Hz y 7 kHz, RMS 0,0025.
 *  8. Cortes cada 4–12 s, de 50–250 ms, bajando al 15–50 % con bordes suaves.
 *  9. Chasquidos sueltos (0,3 por segundo).
 *
 * Además, antes del paso 1 se aplica una ganancia de entrada (la voz limpia de las cintas llega a
 * unos −19 dB RMS y la receta se calibró con una voz unos 4 dB más baja) y al final un techo suave
 * como el de la receta, por si un chasquido coincide con un pico.
 *
 * Trabaja sobre muestras float intercaladas (1 o más canales), en el sitio y sin asignar memoria
 * mientras procesa: todo se reserva en el constructor. No es seguro entre hilos (lo usa solo el
 * hilo de reproducción).
 *
 * [adornos] y [wow] existen para los tests (comparar la cadena de filtros con ffmpeg).
 */
internal class MotorCasete(
    val frecuencia: Int,
    val canales: Int,
    semilla: Long,
    private val adornos: Boolean = true,
    private val wow: Boolean = true,
) {
    private val fs = frecuencia.toDouble()
    private val azar = Aleatorio(semilla)

    // --- Voz: filtros, compresor, saturación y retardo (un estado por canal) ---
    private val filtros = Array(canales) {
        CadenaBiquad(
            arrayOf(
                Biquad.pasoAlto(fs, 220.0),
                Biquad.pasoAlto(fs, 220.0),
                Biquad.pasoBajo(fs, 5000.0),
                Biquad.pasoBajo(fs, 5000.0),
                Biquad.pasoBajo(fs, 5500.0),
                Biquad.pico(fs, 1500.0, 5.0, 1.2),
            )
        )
    }
    private val compresor = Compresor(fs)
    private val lineas = Array(canales) { LineaRetardo(capacidadRetardo(fs)) }
    private val voz = DoubleArray(canales)

    // Fases del wow & flutter (en radianes) y su avance por muestra.
    private var fase1 = 0.0
    private var fase2 = FASE2
    private var fase3 = FASE3
    private val paso1 = 2 * PI * WOW1_HZ / fs
    private val paso2 = 2 * PI * WOW2_HZ / fs
    private val paso3 = 2 * PI * FLUTTER_HZ / fs

    // --- Siseo, cortes y chasquidos (comunes a todos los canales) ---
    private val siseo = Siseo(fs, azar)
    private val escalaSiseo = SISEO_RMS / Siseo.medirRms(fs)

    private var hastaCorte = 0L
    private var corteLargo = 0
    private var corteIndice = -1
    private var corteFondo = 1.0

    private val filtroClic = CadenaBiquad(
        arrayOf(
            Biquad.pasoAlto(fs, 300.0),
            Biquad.pasoAlto(fs, 300.0),
            Biquad.pasoBajo(fs, 7000.0),
            Biquad.pasoBajo(fs, 7000.0),
        )
    )
    private var hastaClic = 0L
    private var clicLargo = 0
    private var clicIndice = -1
    private var clicAmplitud = 0.0
    private var colaClic = 0

    init {
        programarCorte()
        programarClic()
    }

    /** Procesa [frames] muestras por canal de [datos] (intercaladas), en el sitio. */
    fun procesar(datos: FloatArray, frames: Int) {
        var i = 0
        for (f in 0 until frames) {
            // 1–2: filtros de banda y pico; nivel de detección (media de los canales).
            var nivel = 0.0
            for (c in 0 until canales) {
                val entrada = datos[i + c]
                // NaN, infinitos o valores absurdos (solo posibles en float) dejarían el filtro roto para siempre.
                val limpia = if (abs(entrada) <= ENTRADA_MAXIMA) entrada.toDouble() else 0.0
                val x = filtros[c].procesar(limpia * GANANCIA_ENTRADA)
                voz[c] = x
                nivel += abs(x)
            }
            // 3–4: compresor, +7 dB.
            val g = compresor.ganancia(nivel / canales) * GANANCIA_SATURACION

            // 5: retardo del wow & flutter (común a los canales).
            val retardo = if (wow) retardoMuestras() else RETARDO_BASE * fs

            // 7–9: siseo, cortes y chasquidos.
            val ruido: Double
            val corte: Double
            val clic: Double
            if (adornos) {
                ruido = siseo.siguiente() * escalaSiseo
                corte = gananciaCorte()
                clic = muestraClic()
            } else {
                ruido = 0.0
                corte = 1.0
                clic = 0.0
            }

            for (c in 0 until canales) {
                val saturada = UMBRAL_SATURACION * tanh(voz[c] * g / UMBRAL_SATURACION)
                val conWow = lineas[c].procesar(saturada, retardo)
                val y = (conWow * GANANCIA_FINAL + ruido) * corte + clic
                datos[i + c] = techo(y).toFloat()
            }
            i += canales
        }
    }

    /** Vacía filtros, compresor y retardos (tras un salto o al volver a activar el efecto). */
    fun reiniciar() {
        filtros.forEach { it.reiniciar() }
        compresor.reiniciar()
        lineas.forEach { it.reiniciar() }
        siseo.reiniciar()
        filtroClic.reiniciar()
        corteIndice = -1
        clicIndice = -1
        colaClic = 0
        programarCorte()
        programarClic()
    }

    private fun retardoMuestras(): Double {
        val segundos = RETARDO_BASE +
            WOW1_S * sin(fase1) + WOW2_S * sin(fase2) + FLUTTER_S * sin(fase3)
        fase1 += paso1
        fase2 += paso2
        fase3 += paso3
        if (fase1 > DOS_PI) fase1 -= DOS_PI
        if (fase2 > DOS_PI) fase2 -= DOS_PI
        if (fase3 > DOS_PI) fase3 -= DOS_PI
        return segundos * fs
    }

    // --- Cortes: la cinta pierde contacto un instante ---

    private fun programarCorte() {
        hastaCorte = (azar.uniforme(CORTE_CADA_MIN, CORTE_CADA_MAX) * fs).toLong()
    }

    private fun gananciaCorte(): Double {
        if (corteIndice >= 0) {
            // 1 − (1 − fondo) · hanning^0,5, como en la receta.
            val g = 1.0 - (1.0 - corteFondo) * sin(PI * corteIndice / (corteLargo - 1))
            if (++corteIndice >= corteLargo) corteIndice = -1
            return g
        }
        if (--hastaCorte <= 0) {
            corteLargo = ((azar.uniforme(CORTE_DURA_MIN, CORTE_DURA_MAX) + 2 * CORTE_BORDE) * fs).toInt().coerceAtLeast(3)
            corteFondo = azar.uniforme(CORTE_FONDO_MIN, CORTE_FONDO_MAX)
            corteIndice = 1
            programarCorte()
        }
        return 1.0
    }

    // --- Chasquidos ---

    private fun programarClic() {
        // Intervalos exponenciales: unos CLICS_POR_SEGUNDO de media, al azar.
        hastaClic = (-ln(1.0 - azar.uniforme()) / CLICS_POR_SEGUNDO * fs).toLong().coerceAtLeast(1)
    }

    private fun muestraClic(): Double {
        var x = 0.0
        if (clicIndice >= 0) {
            val hann = 0.5 - 0.5 * cos(2 * PI * clicIndice / (clicLargo - 1))
            x = azar.normal() * hann * clicAmplitud
            if (++clicIndice >= clicLargo) {
                clicIndice = -1
                colaClic = (COLA_CLIC_S * fs).toInt()
            }
        } else if (--hastaClic <= 0) {
            val escala = fs / 48000.0
            clicLargo = (azar.uniforme(CLIC_MIN, CLIC_MAX) * escala).toInt().coerceAtLeast(3)
            clicAmplitud = azar.uniforme(0.3, 1.0)
            clicIndice = 0
            programarClic()
        } else if (colaClic > 0) {
            if (--colaClic == 0) {
                filtroClic.reiniciar()
                return 0.0
            }
        } else {
            return 0.0
        }
        return filtroClic.procesar(x) * NIVEL_CLIC
    }

    /** Techo suave de la receta: por encima de 0,7 se acerca a 0,89 (−1 dBFS) sin pasarlo. */
    private fun techo(y: Double): Double {
        val a = abs(y)
        if (a <= TECHO_RODILLA) return y
        if (a.isNaN()) return 0.0
        return sign(y) * (TECHO_RODILLA + TECHO_MARGEN * tanh((a - TECHO_RODILLA) / TECHO_MARGEN))
    }

    companion object {
        /** La voz limpia llega a unos −19 dB RMS; la receta se afinó con una voz unos 4 dB más baja. */
        val GANANCIA_ENTRADA = 10.0.pow(-4.0 / 20)
        private val GANANCIA_SATURACION = 10.0.pow(7.0 / 20)
        private const val UMBRAL_SATURACION = 0.45

        /**
         * Ganancia final fija: deja la voz a unos −16 dB RMS (medido donde se habla), como las
         * muestras de muestras-cinta/compresion (unos −16,5 a −17 dB de media contando pausas).
         */
        val GANANCIA_FINAL = 10.0.pow(-0.4 / 20)

        private const val RETARDO_BASE = 0.004
        private const val WOW1_S = 0.0014
        private const val WOW1_HZ = 0.5
        private const val WOW2_S = 0.0022
        private const val WOW2_HZ = 0.19
        private const val FASE2 = 1.3
        private const val FLUTTER_S = 0.00004
        private const val FLUTTER_HZ = 7.0
        private const val FASE3 = 0.4
        private const val DOS_PI = 2 * PI

        private const val SISEO_RMS = 0.0025

        private const val CORTE_CADA_MIN = 4.0
        private const val CORTE_CADA_MAX = 12.0
        private const val CORTE_DURA_MIN = 0.05
        private const val CORTE_DURA_MAX = 0.25
        private const val CORTE_BORDE = 0.012
        private const val CORTE_FONDO_MIN = 0.15
        private const val CORTE_FONDO_MAX = 0.5

        private const val CLICS_POR_SEGUNDO = 0.3
        private const val CLIC_MIN = 8.0
        private const val CLIC_MAX = 60.0
        private const val NIVEL_CLIC = 0.04
        private const val COLA_CLIC_S = 0.05

        private const val ENTRADA_MAXIMA = 4f
        private const val TECHO_RODILLA = 0.7
        private const val TECHO_MARGEN = 0.19

        /** Retardo máximo del wow (4 + 1,4 + 2,2 + 0,04 ms) más margen, en potencia de 2. */
        private fun capacidadRetardo(fs: Double): Int {
            val necesario = (0.0077 * fs).toInt() + 4
            var c = 64
            while (c < necesario) c = c shl 1
            return c
        }
    }
}

/** Línea de retardo con lectura fraccionaria (interpolación lineal). */
internal class LineaRetardo(capacidad: Int) {

    private val buffer = DoubleArray(capacidad)
    private val mascara = capacidad - 1
    private var escritura = 0

    fun procesar(x: Double, retardo: Double): Double {
        buffer[escritura] = x
        val lectura = escritura - retardo
        val base = floor(lectura)
        val fraccion = lectura - base
        val i0 = base.toInt()
        val a = buffer[i0 and mascara]
        val b = buffer[(i0 + 1) and mascara]
        escritura = (escritura + 1) and mascara
        return a + (b - a) * fraccion
    }

    fun reiniciar() {
        buffer.fill(0.0)
        escritura = 0
    }
}

/**
 * Siseo de cinta: ruido rosa (filtro «refinado» de Paul Kellet sobre ruido blanco) limitado a
 * 900 Hz – 7 kHz con biquads. Sale sin escalar: el motor lo lleva al RMS de la receta.
 */
internal class Siseo(fs: Double, private val azar: Aleatorio) {

    private var b0 = 0.0
    private var b1 = 0.0
    private var b2 = 0.0
    private var b3 = 0.0
    private var b4 = 0.0
    private var b5 = 0.0
    private var b6 = 0.0
    private val banda = CadenaBiquad(
        arrayOf(
            Biquad.pasoAlto(fs, 900.0),
            Biquad.pasoAlto(fs, 900.0),
            Biquad.pasoBajo(fs, 7000.0),
            Biquad.pasoBajo(fs, 7000.0),
        )
    )

    fun siguiente(): Double {
        val blanco = azar.uniforme() * 2 - 1
        b0 = 0.99886 * b0 + blanco * 0.0555179
        b1 = 0.99332 * b1 + blanco * 0.0750759
        b2 = 0.96900 * b2 + blanco * 0.1538520
        b3 = 0.86650 * b3 + blanco * 0.3104856
        b4 = 0.55000 * b4 + blanco * 0.5329522
        b5 = -0.7616 * b5 - blanco * 0.0168980
        val rosa = b0 + b1 + b2 + b3 + b4 + b5 + b6 + blanco * 0.5362
        b6 = blanco * 0.115926
        return banda.procesar(rosa)
    }

    fun reiniciar() {
        b0 = 0.0; b1 = 0.0; b2 = 0.0; b3 = 0.0; b4 = 0.0; b5 = 0.0; b6 = 0.0
        banda.reiniciar()
    }

    companion object {
        /** RMS del siseo sin escalar a [fs] Hz (se mide una vez, con una semilla fija). */
        fun medirRms(fs: Double): Double {
            val prueba = Siseo(fs, Aleatorio(0x5EED))
            val calentar = (0.1 * fs).toInt()
            repeat(calentar) { prueba.siguiente() }
            val n = (2 * fs).toInt()
            var suma = 0.0
            repeat(n) {
                val x = prueba.siguiente()
                suma += x * x
            }
            return sqrt(suma / n).coerceAtLeast(1e-9)
        }
    }
}
