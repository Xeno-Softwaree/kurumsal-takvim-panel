$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\Users\Xeno\Desktop\takvim_takip\logo.png'))
Set-Content -Path 'C:\Users\Xeno\Desktop\takvim_takip\logo_base64.txt' -Value $base64 -NoNewline
Write-Host "Base64 conversion completed"