package com.heyteamsoftware.truecrimecalendar.valoracion

import android.app.Activity
import com.google.android.play.core.review.ReviewManager
import com.google.android.play.core.review.ReviewManagerFactory

/**
 * Valoración dentro de la app (docs/CONTRATO.md 7.4, `requestReview`): la página la pide una sola vez,
 * cuando el usuario tiene 5 casos cerrados. Google decide si muestra la ventana (tiene su propio límite de
 * veces) y nunca dice si el usuario ha puntuado, así que aquí no se hace nada con el resultado.
 * Fuera de Google Play (instalada a mano) la petición termina sin mostrar nada.
 */
class PedirValoracion(private val actividad: Activity) {

    // Perezoso: la actividad aún no tiene contexto cuando se construye esta clase.
    private val manager: ReviewManager by lazy { ReviewManagerFactory.create(actividad) }
    private var enCurso = false

    fun pedir() {
        if (enCurso || actividad.isFinishing || actividad.isDestroyed) return
        enCurso = true
        manager.requestReviewFlow().addOnCompleteListener { peticion ->
            if (!peticion.isSuccessful || actividad.isFinishing || actividad.isDestroyed) {
                enCurso = false
                return@addOnCompleteListener
            }
            manager.launchReviewFlow(actividad, peticion.result).addOnCompleteListener { enCurso = false }
        }
    }
}
