$infile = ".sops.yaml"
$outfile = ".sops.yaml.tmp"

(Get-Content $infile -Raw) -replace "`r`n", "`n" -replace "`r", "`n" -replace "`t", "  " | Set-Content -NoNewline -Encoding utf8 $outfile

$bytes = [System.IO.File]::ReadAllBytes($outfile)
if ($bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
    [System.IO.File]::WriteAllBytes($outfile, $bytes[3..($bytes.Length-1)])
}

Move-Item -Force $outfile $infile
Write-Host "✅ Normalized $infile to UTF-8 (no BOM), LF, spaces only." 