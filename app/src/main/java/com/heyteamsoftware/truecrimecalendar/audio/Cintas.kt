package com.heyteamsoftware.truecrimecalendar.audio

import com.heyteamsoftware.truecrimecalendar.AbrirApp
import org.json.JSONException
import org.json.JSONObject

/** Una cinta de un caso v3 (contrato 7.4). [uri] ya es reproducible (`asset:///…` o `https://…`). */
internal data class Cinta(val n: Int, val titulo: String, val uri: String, val duracionMs: Long)

/** Caso v3 cargado en el reproductor: lo que llega en `playCase`, ya validado. */
internal data class CasoCintas(
    val id: String,
    val titulo: String,
    val subtitulo: String,
    val cintas: List<Cinta>,
    /** Si las cintas llevan el efecto de casete (por defecto sí: son voz limpia). */
    val efecto: Boolean,
) {
    fun indiceDe(n: Int): Int? = cintas.indexOfFirst { it.n == n }.takeIf { it >= 0 }
}

/** Qué es cada elemento de la lista del reproductor. Va en `MediaItem.localConfiguration.tag`. */
internal enum class TipoPista { CINTA, INSERTAR, CAMBIO, EPISODIO }

/**
 * Etiqueta de cada elemento: el renderizador la lee para decidir el efecto y el servicio para
 * saber en qué cinta está. [indice] es la cinta (0, 1…) a la que pertenece una cinta o el sonido
 * que la precede; −1 en los episodios v2.
 */
internal class Pista(val tipo: TipoPista, val casoId: String, val caso: CasoCintas?, val indice: Int) {
    val conEfecto: Boolean get() = tipo == TipoPista.CINTA && caso?.efecto == true
    val esSonido: Boolean get() = tipo == TipoPista.INSERTAR || tipo == TipoPista.CAMBIO
}

/** Petición de `playCase(json)`: el caso, la cinta por la que empezar ([indiceDesde]) y el punto. */
internal class PeticionCaso(val caso: CasoCintas, val indiceDesde: Int, val posMs: Long) {

    companion object {
        private const val MAX_CINTAS = 20
        private const val MAX_TEXTO = 300

        /** `{"id","titulo","subtitulo","cintas":[{"n","titulo","url","durationMs"}],"desde","posMs"}`. Null si no vale. */
        fun leer(json: String?): PeticionCaso? {
            val o = try {
                JSONObject(json ?: return null)
            } catch (_: JSONException) {
                return null
            }
            val id = texto(o, "id").takeIf(AbrirApp::idValido) ?: return null
            val lista = o.optJSONArray("cintas") ?: return null
            val cintas = mutableListOf<Cinta>()
            for (i in 0 until lista.length()) {
                val c = lista.optJSONObject(i) ?: continue
                val uri = RutasAudio.resolver(texto(c, "url")) ?: continue
                val n = if (c.has("n")) c.optInt("n", 0) else cintas.size + 1
                if (n < 1 || cintas.any { it.n == n }) continue
                cintas += Cinta(n, texto(c, "titulo").take(MAX_TEXTO), uri, c.optLong("durationMs", 0L).coerceAtLeast(0L))
                if (cintas.size == MAX_CINTAS) break
            }
            if (cintas.isEmpty()) return null
            cintas.sortBy { it.n }
            val caso = CasoCintas(
                id = id,
                titulo = texto(o, "titulo").take(MAX_TEXTO),
                subtitulo = texto(o, "subtitulo").take(MAX_TEXTO),
                cintas = cintas,
                efecto = texto(o, "efecto").let { it.isEmpty() || it == "casete-gastado" },
            )
            val desde = caso.indiceDe(o.optInt("desde", cintas.first().n)) ?: 0
            val posMs = o.optLong("posMs", 0L).coerceAtLeast(0L)
            return PeticionCaso(caso, desde, posMs)
        }

        /** optString de Android devuelve "null" con un null de JSON: aquí, cadena vacía. */
        private fun texto(o: JSONObject, clave: String): String =
            if (o.isNull(clave)) "" else o.optString(clave).trim()
    }
}

/**
 * URLs de las cintas (contrato 7.2): relativas a la página (`audio/brady/cinta-1.ogg`, se leen de
 * los assets) o absolutas `https://` (audios fuera de la APK, para el futuro). También se aceptan
 * las absolutas de la propia página (`https://appassets.androidplatform.net/assets/…`).
 */
internal object RutasAudio {

    private const val ORIGEN_PAGINA = "https://appassets.androidplatform.net/assets/"
    private val SEGURA = Regex("[A-Za-z0-9_\\-][A-Za-z0-9_\\-./]{0,255}")
    private val SIN_ESPACIOS = Regex("[^\\s\\u0000-\\u001f\\u007f]+")

    /** URI reproducible (`asset:///…` o `https://…`) o null si la URL no se admite. */
    fun resolver(url: String?): String? {
        val u = url?.trim().orEmpty()
        if (u.isEmpty() || u.length > 2048) return null
        if (u.startsWith(ORIGEN_PAGINA, ignoreCase = true)) return asset(u.substring(ORIGEN_PAGINA.length))
        if (u.startsWith("https://", ignoreCase = true)) {
            return u.takeIf { SIN_ESPACIOS.matches(it) && it.length > "https://".length }
        }
        if (u.contains(':')) return null // http, file, content, javascript…: no
        return asset(u.removePrefix("./"))
    }

    /** Ruta dentro de assets de un `asset:///…`, o null si es otra cosa. */
    fun rutaAsset(uri: String): String? = uri.takeIf { it.startsWith(ESQUEMA_ASSET) }?.substring(ESQUEMA_ASSET.length)

    private const val ESQUEMA_ASSET = "asset:///"

    private fun asset(ruta: String): String? {
        val limpia = ruta.substringBefore('#').substringBefore('?')
        if (!SEGURA.matches(limpia) || limpia.contains("//")) return null
        if (limpia.split('/').any { it == ".." || it == "." }) return null
        return ESQUEMA_ASSET + limpia
    }
}
