package com.heyteamsoftware.truecrimecalendar.audio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RutasAudioTest {

    @Test
    fun relativasVanAAssets() {
        assertEquals("asset:///audio/brady/cinta-1.ogg", RutasAudio.resolver("audio/brady/cinta-1.ogg"))
        assertEquals("asset:///audio/brady/cinta-1.ogg", RutasAudio.resolver("./audio/brady/cinta-1.ogg"))
        assertEquals("asset:///audio/dalia-negra/cinta-2.ogg", RutasAudio.resolver(" audio/dalia-negra/cinta-2.ogg?v=3 "))
        assertEquals(
            "asset:///audio/brady/cinta-1.ogg",
            RutasAudio.resolver("https://appassets.androidplatform.net/assets/audio/brady/cinta-1.ogg"),
        )
    }

    @Test
    fun absolutasHttps() {
        assertEquals("https://example.org/tcc/brady/cinta-1.ogg", RutasAudio.resolver("https://example.org/tcc/brady/cinta-1.ogg"))
    }

    @Test
    fun rechazaLoDemas() {
        assertNull(RutasAudio.resolver(null))
        assertNull(RutasAudio.resolver(""))
        assertNull(RutasAudio.resolver("http://example.org/a.ogg"))
        assertNull(RutasAudio.resolver("file:///sdcard/a.ogg"))
        assertNull(RutasAudio.resolver("content://x/a.ogg"))
        assertNull(RutasAudio.resolver("javascript:alert(1)"))
        assertNull(RutasAudio.resolver("../../shared_prefs/a.xml"))
        assertNull(RutasAudio.resolver("audio/../../x.ogg"))
        assertNull(RutasAudio.resolver("/audio/x.ogg"))
        assertNull(RutasAudio.resolver("https://example.org/a b.ogg"))
    }

    @Test
    fun rutaDeAsset() {
        assertEquals("audio/x.ogg", RutasAudio.rutaAsset("asset:///audio/x.ogg"))
        assertNull(RutasAudio.rutaAsset("https://example.org/x.ogg"))
    }
}
