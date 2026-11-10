# Sube a /var/www/html/truecrimescalendar del servidor las cintas grabadas (carpetas audio/<id>/) y deja los permisos de lectura.
# Uso: powershell -File tools/subir_audios.ps1 [id1 id2 ...]   (sin ids: sube todas las carpetas que no estén ya)
param([string[]]$Ids)
$k = "$env:USERPROFILE\.ssh\servidor-apps-tcc.key"
$base = Join-Path $PSScriptRoot "..\app\src\main\assets\audio"
$dest = "ubuntu@129.151.249.242:/var/www/html/truecrimescalendar/"
if (-not $Ids) { $Ids = Get-ChildItem $base -Directory | ForEach-Object Name }
foreach ($id in $Ids) { scp -i $k -o BatchMode=yes -r "$base\$id" $dest | Out-Null }
ssh -i $k -o BatchMode=yes ubuntu@129.151.249.242 "chmod -R u=rwX,go=rX /var/www/html/truecrimescalendar; du -sh /var/www/html/truecrimescalendar; ls /var/www/html/truecrimescalendar | wc -l"
