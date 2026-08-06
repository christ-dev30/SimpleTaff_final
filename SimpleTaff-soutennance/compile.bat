@echo off
setlocal enabledelayedexpansion
set /p CP=<cp.txt
"C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot\bin\javac.exe" -encoding UTF-8 -d target/classes -cp "target/classes;%CP%;C:\Users\junio\.m2\repository\com\github\librepdf\openpdf\2.0.2\openpdf-2.0.2.jar" @sources.txt
