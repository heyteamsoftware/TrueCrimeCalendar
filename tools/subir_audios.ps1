# Sube al servidor (/var/www/html/truecrimescalendar) las cintas grabadas (cintas/<id>/) y el índice
# (app/src/main/assets/audio/index.json), y deja los permisos de lectura.
# Uso: powershell -File tools/subir_audios.ps1 [id1 id2 ...]   (sin ids: sube todas las carpetas)
param([string[]]$Ids)
$k = "$env:USERPROFILE\.ssh\servidor-apps-tcc.key"
$base = Join-Path $PSScriptRoot "..\cintas"
$indice = Join-Path $PSScriptRoot "..\app\src\main\assets\audio\index.json"
$dest = "ubuntu@129.151.249.242:/var/www/html/truecrimescalendar/"
if (-not $Ids) { $Ids = Get-ChildItem $base -Directory | ForEach-Object Name }
foreach ($id in $Ids) { scp -i $k -o BatchMode=yes -r "$base\$id" $dest | Out-Null }
scp -i $k -o BatchMode=yes $indice $dest | Out-Null
ssh -i $k -o BatchMode=yes ubuntu@129.151.249.242 "chmod -R u=rwX,go=rX /var/www/html/truecrimescalendar; du -sh /var/www/html/truecrimescalendar; find /var/www/html/truecrimescalendar -name '*.ogg' | wc -l"
