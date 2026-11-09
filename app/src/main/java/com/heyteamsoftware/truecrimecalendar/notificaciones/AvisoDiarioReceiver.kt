package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.time.LocalDate

/** Salta con la alarma diaria: avisa de los casos de hoy (si los hay) y programa la siguiente. */
class AvisoDiarioReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACCION) return
        val hoy = LocalDate.now()
        if (AjustesAvisos.activados(context) && !AjustesAvisos.yaRevisado(context, hoy)) {
            Notificador.avisarDelDia(context, hoy)
            AjustesAvisos.marcarRevisado(context, hoy)
        }
        ProgramadorAvisos.programar(context)
    }

    companion object {
        const val ACCION = "com.heyteamsoftware.truecrimecalendar.AVISO_DIARIO"
    }
}
