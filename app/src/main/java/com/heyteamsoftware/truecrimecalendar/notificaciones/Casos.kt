package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.content.Context
import android.util.Log
import androidx.core.content.edit
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.time.LocalDate
import java.time.YearMonth

/** Un caso tal como lo envía la web con setCases: `{"id","n","a","m","d"}` (mes 1-12). */
data class Caso(val id: String, val nombre: String, val alias: String, val mes: Int, val dia: Int) {

    /** Aniversario en [anio]. El 29 de febrero cae en 28 si el año no es bisiesto (como en la web). */
    fun fechaEn(anio: Int): LocalDate {
        val mesDelAnio = YearMonth.of(anio, mes)
        return mesDelAnio.atDay(dia.coerceAtMost(mesDelAnio.lengthOfMonth()))
    }

    /** Próximo aniversario a partir de [desde] (incluido). */
    fun proximaFecha(desde: LocalDate): LocalDate =
        fechaEn(desde.year).let { if (it.isBefore(desde)) fechaEn(desde.year + 1) else it }
}

/** Lista de casos guardada en SharedPreferences para los avisos diarios. */
internal object AlmacenCasos {

    private const val ARCHIVO = "casos"
    private const val CLAVE = "lista"
    private const val TAG = "AlmacenCasos"

    /** Guarda los casos válidos de [json]. Devuelve cuántos se han guardado. */
    fun guardar(context: Context, json: String): Int {
        val casos = try {
            leer(JSONArray(json))
        } catch (e: JSONException) {
            Log.w(TAG, "setCases recibió un JSON no válido", e)
            return 0
        }
        val normalizado = JSONArray().apply {
            casos.forEach {
                put(
                    JSONObject().put("id", it.id).put("n", it.nombre).put("a", it.alias)
                        .put("m", it.mes).put("d", it.dia)
                )
            }
        }.toString()
        val prefs = context.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)
        if (prefs.getString(CLAVE, null) != normalizado) prefs.edit { putString(CLAVE, normalizado) }
        return casos.size
    }

    fun cargar(context: Context): List<Caso> {
        val json = context.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)
            .getString(CLAVE, null) ?: return emptyList()
        return try {
            leer(JSONArray(json))
        } catch (_: JSONException) {
            emptyList()
        }
    }

    /** Casos cuyo aniversario es [dia]. */
    fun delDia(casos: List<Caso>, dia: LocalDate): List<Caso> =
        casos.filter { it.fechaEn(dia.year) == dia }

    /** Primera fecha posterior a [hoy] con algún aniversario, y sus casos. */
    fun proximos(casos: List<Caso>, hoy: LocalDate): Pair<LocalDate, List<Caso>>? {
        val manana = hoy.plusDays(1)
        val fecha = casos.minOfOrNull { it.proximaFecha(manana) } ?: return null
        return fecha to casos.filter { it.proximaFecha(manana) == fecha }
    }

    private fun leer(array: JSONArray): List<Caso> = buildList {
        for (i in 0 until array.length()) {
            val o = array.optJSONObject(i) ?: continue
            val id = o.optString("id")
            val mes = o.optInt("m")
            val dia = o.optInt("d")
            if (!AbrirApp.idValido(id) || mes !in 1..12 || dia !in 1..31) continue
            add(Caso(id, o.optString("n").ifBlank { id }, o.optString("a"), mes, dia))
        }
    }
}
