package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.content.Context
import android.content.SharedPreferences
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.edit
import java.time.LocalDate

/**
 * Preferencias de los avisos diarios: desactivados hasta que el usuario los activa en la ficha
 * de ajustes (ahí se pide el permiso), a las 9:00 por defecto.
 */
internal object AjustesAvisos {

    private const val ARCHIVO = "avisos"
    private const val ACTIVADOS = "activados"
    private const val HORA = "hora"
    private const val MINUTO = "minuto"
    private const val PERMISO_PEDIDO = "permisoPedido"
    private const val ULTIMO_DIA = "ultimoDiaRevisado"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)

    fun activados(context: Context): Boolean {
        val p = prefs(context)
        if (p.contains(ACTIVADOS)) return p.getBoolean(ACTIVADOS, false)
        // Instalaciones de la versión 2.0 (avisos activados por defecto, permiso pedido al
        // arrancar): si el usuario concedió el permiso, se respetan como activados.
        val migrar = p.getBoolean(PERMISO_PEDIDO, false) &&
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        p.edit { putBoolean(ACTIVADOS, migrar) }
        return migrar
    }
    fun hora(context: Context) = prefs(context).getInt(HORA, 9)
    fun minuto(context: Context) = prefs(context).getInt(MINUTO, 0)

    fun guardarActivados(context: Context, activados: Boolean) =
        prefs(context).edit { putBoolean(ACTIVADOS, activados) }

    fun guardarHora(context: Context, hora: Int, minuto: Int) =
        prefs(context).edit { putInt(HORA, hora).putInt(MINUTO, minuto) }

    /** Si ya se mostró el diálogo del permiso (la segunda vez se abren los ajustes de Android). */
    fun permisoPedido(context: Context) = prefs(context).getBoolean(PERMISO_PEDIDO, false)
    fun marcarPermisoPedido(context: Context) = prefs(context).edit { putBoolean(PERMISO_PEDIDO, true) }

    /** Evita avisar dos veces el mismo día (por ejemplo, si se cambia la hora después del aviso). */
    fun yaRevisado(context: Context, dia: LocalDate) = prefs(context).getString(ULTIMO_DIA, null) == dia.toString()
    fun marcarRevisado(context: Context, dia: LocalDate) = prefs(context).edit { putString(ULTIMO_DIA, dia.toString()) }
}
