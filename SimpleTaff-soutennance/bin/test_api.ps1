$loginBody = @{ email = "coord@simpletaff.com"; password = "password" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/signin" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
$headers = @{ "Authorization" = "Bearer $token" }
try {
    $agents = Invoke-RestMethod -Uri "http://localhost:8080/api/coordonnateur/agents" -Headers $headers
    $agents | ConvertTo-Json
} catch {
    Write-Error $_
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Output "Error Response: $responseBody"
    }
}
