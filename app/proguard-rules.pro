# Puente JavaScript (window.TCCNative): WebView busca los métodos por su nombre y exige
# que conserven la anotación @JavascriptInterface en tiempo de ejecución.
-keepattributes RuntimeVisibleAnnotations
-keepclassmembers class com.heyteamsoftware.truecrimecalendar.puente.PuenteNativo {
    @android.webkit.JavascriptInterface public <methods>;
}
