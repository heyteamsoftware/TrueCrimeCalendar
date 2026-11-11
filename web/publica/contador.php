<?php
// Contador de visitas de truecrime.html: un número y nada más (sin cookies ni direcciones IP).
// GET devuelve el total; POST suma una visita y devuelve el total.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$archivo = __DIR__ . '/contador.json';
$fp = @fopen($archivo, 'c+');
if (!$fp) { echo json_encode(['visitas' => null]); exit; }
flock($fp, LOCK_EX);
$datos = json_decode(stream_get_contents($fp), true);
$total = is_array($datos) && isset($datos['visitas']) ? (int)$datos['visitas'] : 0;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $total++;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode(['visitas' => $total]));
}
flock($fp, LOCK_UN);
fclose($fp);
echo json_encode(['visitas' => $total]);
