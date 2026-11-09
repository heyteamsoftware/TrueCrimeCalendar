package com.heyteamsoftware.truecrimecalendar.audio.casete

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

class MotorCaseteTest {

    private val fs = 48_000

    // --- Filtros ---

    @Test
    fun filtrosDeBandaRespondenComoLaReceta() {
        val f = fs.toDouble()
        val altos = CadenaBiquad(arrayOf(Biquad.pasoAlto(f, 220.0), Biquad.pasoAlto(f, 220.0)))
        val bajos = CadenaBiquad(arrayOf(Biquad.pasoBajo(f, 5000.0), Biquad.pasoBajo(f, 5000.0), Biquad.pasoBajo(f, 5500.0)))

        // Paso alto: −3 dB por etapa en el corte, casi nada en la voz y mucho en el zumbido de 50 Hz.
        assertEquals(-6.0, db(altos.respuesta(f, 220.0)), 0.1)
        assertEquals(0.0, db(altos.respuesta(f, 1000.0)), 0.1)
        assertTrue(db(altos.respuesta(f, 50.0)) < -45)

        // Paso bajo: la voz pasa entera; a 10 kHz ya casi no queda nada.
        assertEquals(0.0, db(bajos.respuesta(f, 1000.0)), 0.3)
        assertEquals(-6.0, db(Biquad.pasoBajo(f, 5000.0).respuesta(f, 5000.0) * Biquad.pasoBajo(f, 5000.0).respuesta(f, 5000.0)), 0.1)
        assertTrue(db(bajos.respuesta(f, 10_000.0)) < -30)
    }

    @Test
    fun picoDe5dbEn1500Hz() {
        val pico = Biquad.pico(fs.toDouble(), 1500.0, 5.0, 1.2)
        assertEquals(5.0, db(pico.respuesta(fs.toDouble(), 1500.0)), 0.01)
        assertEquals(0.0, db(pico.respuesta(fs.toDouble(), 100.0)), 0.3)
        assertEquals(0.0, db(pico.respuesta(fs.toDouble(), 15_000.0)), 0.3)
    }

    @Test
    fun laCadenaFiltraUnSenoComoDiceSuRespuesta() {
        val f = fs.toDouble()
        for (hz in doubleArrayOf(100.0, 300.0, 1500.0, 4000.0, 8000.0)) {
            val cadena = CadenaBiquad(
                arrayOf(Biquad.pasoAlto(f, 220.0), Biquad.pasoBajo(f, 5000.0), Biquad.pico(f, 1500.0, 5.0, 1.2))
            )
            val esperado = cadena.respuesta(f, hz)
            var suma = 0.0
            var sumaEntrada = 0.0
            val n = fs
            for (i in 0 until 2 * n) {
                val x = sin(2 * PI * hz * i / f)
                val y = cadena.procesar(x)
                if (i >= n) { // tras un segundo de asentamiento
                    suma += y * y
                    sumaEntrada += x * x
                }
            }
            assertEquals("ganancia a $hz Hz", db(esperado), db(sqrt(suma / sumaEntrada)), 0.05)
        }
    }

    @Test
    fun lineaDeRetardoInterpolaEntreMuestras() {
        val linea = LineaRetardo(64)
        val salida = DoubleArray(16) { i -> linea.procesar(if (i == 0) 1.0 else 0.0, 3.5) }
        assertEquals(0.5, salida[3], 1e-12)
        assertEquals(0.5, salida[4], 1e-12)
        assertEquals(0.0, salida[2], 1e-12)
        assertEquals(0.0, salida[5], 1e-12)
    }

    @Test
    fun compresorSoloBajaLoQuePasaDelUmbral() {
        // Por debajo de la rodilla solo aplica la compensación (×2).
        val suave = Compresor(fs.toDouble())
        var g = 0.0
        repeat(fs) { g = suave.ganancia(0.02) }
        assertEquals(2.0, g, 1e-9)
        // Muy por encima del umbral (−18 dB), ratio 3: a −6 dB RMS baja unos 8 dB (y ×2 = +6 dB).
        val fuerte = Compresor(fs.toDouble())
        repeat(fs) { g = fuerte.ganancia(0.5) }
        assertEquals(-12.0 * (1 - 1 / 3.0) + 6.02, db(g), 0.3)
    }

    // --- Motor completo ---

    @Test
    fun vozDePruebaSaleSinNaNSinSaturarYAlNivelDeLasMuestras() {
        val entrada = vozDePrueba(segundos = 20, rmsDb = -19.0)
        val salida = entrada.copyOf()
        MotorCasete(fs, 1, semilla = 7).procesar(salida, salida.size)

        assertTrue("sin NaN ni infinitos", salida.all { it.isFinite() })
        val pico = salida.maxOf { abs(it) }
        assertTrue("pico $pico por debajo de −1 dBFS", pico < 0.891f)
        val rms = rmsActivo(salida)
        assertTrue("voz a ${"%.1f".format(rms)} dB RMS (debe rondar −16)", rms in -19.0..-13.0)
    }

    @Test
    fun conSilencioQuedaElSiseoDeCinta() {
        val salida = FloatArray(fs * 30)
        MotorCasete(fs, 1, semilla = 3).procesar(salida, salida.size)
        assertTrue(salida.all { it.isFinite() })
        // Siseo de RMS 0,0025 (−52 dB): se mide sin los chasquidos (los trozos más altos).
        val rms = rmsBloques(salida, 4800).sorted()
        val mediana = rms[rms.size / 2]
        assertEquals(-52.0, mediana, 2.0)
        assertTrue("no es silencio", mediana > -70)
    }

    @Test
    fun hayChasquidosYCortes() {
        val segundos = 120
        // Chasquidos: picos aislados por encima de 0,015 (6 veces el RMS del siseo). La receta de
        // referencia (numpy, 3 semillas) da entre 15 y 21 en 120 s con este mismo criterio.
        val silencio = FloatArray(fs * segundos)
        MotorCasete(fs, 1, semilla = 11).procesar(silencio, silencio.size)
        var chasquidos = 0
        var i = 0
        while (i < silencio.size) {
            if (abs(silencio[i]) > 0.015f) {
                chasquidos++
                i += fs / 20 // un chasquido dura menos de 50 ms
            } else {
                i++
            }
        }
        assertTrue("chasquidos: $chasquidos", chasquidos in 8..40)

        // Cortes: con un tono continuo, el nivel baja de vez en cuando más de 3 dB.
        val tono = FloatArray(fs * segundos) { (0.1 * sin(2 * PI * 1000.0 * it / fs)).toFloat() }
        MotorCasete(fs, 1, semilla = 11).procesar(tono, tono.size)
        val bloques = rmsBloques(tono, 480) // 10 ms
        val tipico = bloques.sorted()[bloques.size / 2]
        var cortes = 0
        var dentro = false
        for (b in bloques) {
            val bajo = b < tipico - 3
            if (bajo && !dentro) cortes++
            dentro = bajo
        }
        assertTrue("cortes: $cortes (uno cada 4–12 s)", cortes in 6..35)
    }

    @Test
    fun entradasExtremasNoRompenNada() {
        val azar = Aleatorio(1)
        val ruido = FloatArray(fs * 5) { (azar.uniforme() * 2 - 1).toFloat() }
        MotorCasete(fs, 1, semilla = 5).procesar(ruido, ruido.size)
        assertTrue(ruido.all { it.isFinite() && abs(it) < 0.9f })

        val raro = FloatArray(fs) { if (it % 100 == 0) Float.NaN else if (it % 333 == 0) Float.POSITIVE_INFINITY else 0.3f }
        MotorCasete(fs, 1, semilla = 5).procesar(raro, raro.size)
        assertTrue("NaN en la entrada no se propaga", raro.all { it.isFinite() })
    }

    @Test
    fun estereoYOtrasFrecuencias() {
        for (frecuencia in intArrayOf(44_100, 48_000, 16_000)) {
            val frames = frecuencia * 3
            val datos = FloatArray(frames * 2) { (0.2 * sin(2 * PI * 440.0 * (it / 2) / frecuencia)).toFloat() }
            MotorCasete(frecuencia, 2, semilla = 9).procesar(datos, frames)
            assertTrue(datos.all { it.isFinite() && abs(it) < 0.9f })
            assertTrue(rmsActivo(datos) > -30)
        }
    }

    @Test
    fun mismaSemillaMismoSonido() {
        val a = vozDePrueba(segundos = 3, rmsDb = -19.0)
        val b = a.copyOf()
        MotorCasete(fs, 1, semilla = 42).procesar(a, a.size)
        MotorCasete(fs, 1, semilla = 42).procesar(b, b.size)
        assertArrayEquals(a, b, 0f)
    }

    @Test
    fun procesaMuchoMasRapidoQueElTiempoReal() {
        val datos = vozDePrueba(segundos = 60, rmsDb = -19.0)
        val motor = MotorCasete(fs, 1, semilla = 1)
        motor.procesar(datos.copyOf(fs * 5), fs * 5) // calentar el JIT
        val inicio = System.nanoTime()
        // En bloques como los del reproductor.
        val bloque = 1024
        var i = 0
        val trozo = FloatArray(bloque)
        while (i + bloque <= datos.size) {
            System.arraycopy(datos, i, trozo, 0, bloque)
            motor.procesar(trozo, bloque)
            i += bloque
        }
        val segundos = (System.nanoTime() - inicio) / 1e9
        println("60 s de audio en ${"%.3f".format(segundos)} s")
        assertTrue("60 s de audio en $segundos s", segundos < 6.0)
    }

    // --- Utilidades ---

    /** Voz sintética: tono glotal de 140 Hz con armónicos y sílabas de 200 ms con pausas. */
    private fun vozDePrueba(segundos: Int, rmsDb: Double): FloatArray {
        val n = fs * segundos
        val x = FloatArray(n)
        for (i in 0 until n) {
            val t = i.toDouble() / fs
            var s = 0.0
            for (k in 1..25) s += sin(2 * PI * 140.0 * k * t + k) / k
            val silaba = max(0.0, sin(2 * PI * 2.5 * t)) // 2,5 sílabas por segundo
            val frase = if ((t % 4.0) < 3.2) 1.0 else 0.0 // pausas de 0,8 s
            x[i] = (s * silaba * frase).toFloat()
        }
        val actual = rmsActivo(x)
        val g = 10.0.pow((rmsDb - actual) / 20).toFloat()
        for (i in x.indices) x[i] *= g
        return x
    }

    /** RMS de los trozos de 100 ms con voz (como `nivelar` de la receta), en dB. */
    private fun rmsActivo(x: FloatArray): Double {
        val bloques = rmsBloques(x, 4800).map { 10.0.pow(it / 20) }
        val maximo = bloques.max()
        val activos = bloques.filter { it > maximo * 0.1 }
        return db(sqrt(activos.sumOf { it * it } / activos.size))
    }

    private fun rmsBloques(x: FloatArray, tam: Int): List<Double> =
        (0 until x.size / tam).map { b ->
            var s = 0.0
            for (i in b * tam until (b + 1) * tam) s += x[i].toDouble() * x[i]
            db(sqrt(s / tam))
        }

    private fun db(v: Double) = 20 * log10(max(v, 1e-12))
}
