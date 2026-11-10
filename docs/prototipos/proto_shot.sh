#!/bin/sh
# Uso: sh proto_shot.sh a|b  -> genera prototipo-<x>.png (1400x1000) con Edge sin cabeza
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
rm -f prototipo-$1.png
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1400,1000 --virtual-time-budget=8000 --screenshot="C:\Users\aidan\Documents\hey_Truecrimecalendar\docs\prototipos\prototipo-$1.png" "file:///C:/Users/aidan/Documents/hey_Truecrimecalendar/docs/prototipos/prototipo-$1.html" 2>&1 | tail -1
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do [ -s prototipo-$1.png ] && break; sleep 1; done
sleep 1; ls -la prototipo-$1.png
