package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import java.time.LocalDate

/** Preferencias de los avisos diarios (activados por defecto, a las 9:00). */
internal object AjustesAvisos {

    private const val ARCHIVO = "avisos"
    private const val ACTIVADOS = "activados"
    private const val HORA = "hora"
    private const val MINUTO = "minuto"
    private const val PERMISO_PEDIDO = "permisoPedido"
    private const val ULTIMO_DIA = "ultimoDiaRevisado"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)

    fun activados(context: Context) = prefs(context).getBoolean(ACTIVADOS, true)
    fun hora(context: Context) = prefs(context).getInt(HORA, 9)
    fun minuto(context: Context) = prefs(context).getInt(MINUTO, 0)

    fun guardarActivados(context: Context, activados: Boolean) =
        prefs(context).edit { putBoolean(ACTIVADOS, activados) }

    fun guardarHora(context: Context, hora: Int, minuto: Int) =
        prefs(context).edit { putInt(HORA, hora).putInt(MINUTO, minuto) }

    /** El permiso de notificaciones se pide una sola vez al arrancar; aquí se recuerda. */
    fun permisoPedido(context: Context) = prefs(context).getBoolean(PERMISO_PEDIDO, false)
    fun marcarPermisoPedido(context: Context) = prefs(context).edit { putBoolean(PERMISO_PEDIDO, true) }

    /** Evita avisar dos veces el mismo día (por ejemplo, si se cambia la hora después del aviso). */
    fun yaRevisado(context: Context, dia: LocalDate) = prefs(context).getString(ULTIMO_DIA, null) == dia.toString()
    fun marcarRevisado(context: Context, dia: LocalDate) = prefs(context).edit { putString(ULTIMO_DIA, dia.toString()) }
}
