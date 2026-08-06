$cp = Get-Content cp.txt
$pdfJar = "C:\Users\junio\.m2\repository\com\github\librepdf\openpdf\2.0.2\openpdf-2.0.2.jar"
$sources = Get-ChildItem -Path src/main/java -Recurse -Filter *.java | ForEach-Object { $_.FullName }

Write-Host "Compiling Java files..."
& "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot\bin\javac.exe" -parameters -encoding UTF-8 -d target/classes -cp "target/classes;$cp;$pdfJar" $sources

Write-Host "Copying resources to target/classes..."
Copy-Item -Path "src\main\resources\*" -Destination "target\classes" -Recurse -Force
