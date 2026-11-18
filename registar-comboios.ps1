# Regista o endereco comboios:// no Windows (so para o utilizador atual, sem administrador).
# Assim, o botao da pagina pode arrancar Iniciar-Linha-Guimaraes.cmd.
$cmd  = Join-Path $PSScriptRoot 'Iniciar-Linha-Guimaraes.cmd'
$base = 'HKCU:\Software\Classes\comboios'
New-Item -Path $base -Force | Out-Null
Set-ItemProperty -Path $base -Name '(default)' -Value 'URL:Linha de Guimaraes'
New-ItemProperty -Path $base -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
New-Item -Path "$base\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$base\shell\open\command" -Name '(default)' -Value ('cmd.exe /c ""{0}" "%1""' -f $cmd)
Write-Host 'Endereco comboios:// registado. Ja pode usar o botao da pagina.'
