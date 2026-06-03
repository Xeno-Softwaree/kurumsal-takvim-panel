$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\Users\Xeno\Desktop\takvim_takip\logo.png'))
Set-Content -Path 'C:\Users\Xeno\Desktop\takvim_takip\logo_data_uri.txt' -Value "data:image/png;base64,$base64" -NoNewline
Write-Host "Data URI created successfully"