package com.heyteamsoftware.truecrimecalendar.audio

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.core.content.ContextCompat
import androidx.core.graphics.createBitmap
import com.heyteamsoftware.truecrimecalendar.R
import java.io.ByteArrayOutputStream

/** Carátula del podcast (notificación y pantalla de bloqueo): el icono de la app en PNG. */
internal object Caratula {

    private const val LADO = 512

    fun png(context: Context): ByteArray {
        val imagen = createBitmap(LADO, LADO)
        val lienzo = Canvas(imagen)
        lienzo.drawColor(ContextCompat.getColor(context, R.color.desk))
        ContextCompat.getDrawable(context, R.drawable.ic_launcher_foreground)?.let { dibujo ->
            // La hoja ocupa unas 50 de las 108 unidades del icono adaptable: se amplía
            // para que llene el 70 % de la carátula.
            val mitad = (108f * LADO * 0.70f / 50f / 2f).toInt()
            dibujo.setBounds(LADO / 2 - mitad, LADO / 2 - mitad, LADO / 2 + mitad, LADO / 2 + mitad)
            dibujo.draw(lienzo)
        }
        return ByteArrayOutputStream().use { salida ->
            imagen.compress(Bitmap.CompressFormat.PNG, 100, salida)
            imagen.recycle()
            salida.toByteArray()
        }
    }
}
