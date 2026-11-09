package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.content.Context
import android.util.Log
import androidx.core.content.edit
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.text.Normalizer
import java.time.LocalDate
import java.time.YearMonth

/** Qué se conmemora en la fecha del caso (`tipo_efemeride`, contrato 8). */
enum class Efemeride(val clave: String) {
    NACIMIENTO("nacimiento"),
    CRIMEN("crimen"),
    DETENCION("detencion"),
    CONDENA("condena"),
    HALLAZGO("hallazgo"),
    DESAPARICION("desaparicion"),
    GOLPE("golpe");

    companion object {
        /** Como la web: sin tildes ni signos; lo que falte o no se conozca cuenta como nacimiento. */
        fun de(texto: String?): Efemeride {
            if (texto.isNullOrBlank()) return NACIMIENTO
            val limpio = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .lowercase()
                .filter { it in 'a'..'z' }
            return entries.firstOrNull { it.clave == limpio } ?: NACIMIENTO
        }
    }
}

/**
 * Un caso tal como lo envía la web con setCases: `{"id","n","a","m","d","t","e","y"}` (mes 1-12).
 * Los datos de la versión 2 no traen `t`, `e` ni `y`: valen como nacimiento de un caso estrella.
 */
data class Caso(
    val id: String,
    val nombre: String,
    val alias: String,
    val mes: Int,
    val dia: Int,
    val efemeride: Efemeride = Efemeride.NACIMIENTO,
    val estrella: Boolean = true,
    /** Año de la efeméride (en los casos estrella, el de nacimiento), o null si no se sabe. */
    val anio: Int? = null,
) {

    /** Aniversario en [anio]. El 29 de febrero cae en 28 si el año no es bisiesto (como en la web). */
    fun fechaEn(anio: Int): LocalDate {
        val mesDelAnio = YearMonth.of(anio, mes)
        return mesDelAnio.atDay(dia.coerceAtMost(mesDelAnio.lengthOfMonth()))
    }

    /** Años que se cumplen en [anioActual], o null si no se conoce el año o aún no se cumple ninguno. */
    fun aniosEn(anioActual: Int): Int? = anio?.let { anioActual - it }?.takeIf { it >= 1 }
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
                val o = JSONObject().put("id", it.id).put("n", it.nombre).put("a", it.alias)
                    .put("m", it.mes).put("d", it.dia)
                    .put("t", it.efemeride.clave).put("e", it.estrella)
                it.anio?.let { anio -> o.put("y", anio) }
                put(o)
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

    /** Casos cuyo aniversario es [dia]: primero los casos estrella. */
    fun delDia(casos: List<Caso>, dia: LocalDate): List<Caso> =
        casos.filter { it.fechaEn(dia.year) == dia }.sortedByDescending { it.estrella }

    private fun leer(array: JSONArray): List<Caso> = buildList {
        for (i in 0 until array.length()) {
            val o = array.optJSONObject(i) ?: continue
            val id = o.optString("id")
            val mes = o.optInt("m")
            val dia = o.optInt("d")
            if (!AbrirApp.idValido(id) || mes !in 1..12 || dia !in 1..31) continue
            add(
                Caso(
                    id = id,
                    nombre = texto(o, "n").ifBlank { id },
                    alias = texto(o, "a"),
                    mes = mes,
                    dia = dia,
                    efemeride = Efemeride.de(texto(o, "t")),
                    // `e` puede llegar como booleano o como 0/1; sin él, caso estrella (datos v2).
                    estrella = if (o.isNull("e")) true else o.optBoolean("e", o.optInt("e", 1) != 0),
                    anio = if (o.isNull("y")) null else o.optInt("y", 0).takeIf { it in 1..9999 },
                )
            )
        }
    }

    /** optString de Android devuelve "null" con un null de JSON: aquí, cadena vacía. */
    private fun texto(o: JSONObject, clave: String): String =
        if (o.isNull(clave)) "" else o.optString(clave).trim()
}
