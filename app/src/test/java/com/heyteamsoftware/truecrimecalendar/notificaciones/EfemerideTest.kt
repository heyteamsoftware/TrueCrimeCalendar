package com.heyteamsoftware.truecrimecalendar.notificaciones

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class EfemerideTest {

    @Test
    fun tiposComoEnLaWeb() {
        assertEquals(Efemeride.HALLAZGO, Efemeride.de("hallazgo"))
        assertEquals(Efemeride.DETENCION, Efemeride.de("Detención"))
        assertEquals(Efemeride.DESAPARICION, Efemeride.de("desaparición"))
        assertEquals(Efemeride.NACIMIENTO, Efemeride.de(null))
        assertEquals(Efemeride.NACIMIENTO, Efemeride.de(""))
        assertEquals(Efemeride.NACIMIENTO, Efemeride.de("otra cosa"))
    }

    @Test
    fun aniosQueSeCumplen() {
        val dalia = Caso("dalia-negra", "Elizabeth Short", "La Dalia Negra", 1, 15, Efemeride.HALLAZGO, false, 1947)
        assertEquals(79, dalia.aniosEn(2026))
        assertNull(dalia.copy(anio = null).aniosEn(2026))
        assertNull(dalia.copy(anio = 2026).aniosEn(2026))
    }

    @Test
    fun veintinueveDeFebreroEnAnioNoBisiesto() {
        val caso = Caso("x", "X", "", 2, 29)
        assertEquals(LocalDate.of(2026, 2, 28), caso.fechaEn(2026))
        assertEquals(LocalDate.of(2028, 2, 29), caso.fechaEn(2028))
    }
}
