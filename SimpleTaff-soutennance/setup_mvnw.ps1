$wc = New-Object System.Net.WebClient
$wc.DownloadFile("https://raw.githubusercontent.com/takari/maven-wrapper/master/mvnw", "$PWD\mvnw")
$wc.DownloadFile("https://raw.githubusercontent.com/takari/maven-wrapper/master/mvnw.cmd", "$PWD\mvnw.cmd")
New-Item -ItemType Directory -Force -Path "$PWD\.mvn\wrapper"
$wc.DownloadFile("https://raw.githubusercontent.com/takari/maven-wrapper/master/.mvn/wrapper/maven-wrapper.jar", "$PWD\.mvn\wrapper\maven-wrapper.jar")
$wc.DownloadFile("https://raw.githubusercontent.com/takari/maven-wrapper/master/.mvn/wrapper/maven-wrapper.properties", "$PWD\.mvn\wrapper\maven-wrapper.properties")
