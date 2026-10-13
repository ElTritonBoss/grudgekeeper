# Re-export the unit tables from your Warhammer III install and rebuild unit-lore.json.
# Run from the Grudgekeeper source folder:
#   powershell -ExecutionPolicy Bypass -File scripts\refresh-unit-lore.ps1
# Needs RPFM unzipped into tools\rpfm (see docs/unit-lore.md) and Node on PATH.
# Game files are only read; nothing is saved back to them. The exported tables and
# unit-lore.json are game text and stay on your PC (git ignores them).

param(
    # The game's data folder. Found through Steam when left empty.
    [string]$GameData = '',
    # The Grudgekeeper source folder. Defaults to the folder above this script.
    [string]$Repo     = (Split-Path $PSScriptRoot -Parent)
)
$ErrorActionPreference = 'Stop'

function Find-GameData {
    $steam = $null
    foreach ($key in 'HKCU:\Software\Valve\Steam', 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam') {
        $props = Get-ItemProperty $key -ErrorAction SilentlyContinue
        if ($props.SteamPath) { $steam = $props.SteamPath; break }
        if ($props.InstallPath) { $steam = $props.InstallPath; break }
    }
    if (-not $steam) { return $null }
    $libraries = @($steam)
    $vdf = Join-Path $steam 'steamapps\libraryfolders.vdf'
    if (Test-Path $vdf) {
        foreach ($m in [regex]::Matches((Get-Content $vdf -Raw), '"path"\s+"([^"]+)"')) {
            $libraries += $m.Groups[1].Value -replace '\\\\', '\'
        }
    }
    foreach ($lib in $libraries) {
        $data = Join-Path $lib 'steamapps\common\Total War WARHAMMER III\data'
        if (Test-Path (Join-Path $data 'db.pack')) { return $data }
    }
    return $null
}

if (-not $GameData) { $GameData = Find-GameData }
if (-not $GameData -or -not (Test-Path (Join-Path $GameData 'db.pack'))) {
    throw "Couldn't find Warhammer III's data folder. Pass it with -GameData 'X:\...\Total War WARHAMMER III\data'."
}
Write-Host "Game data: $GameData"

$Rpfm   = Join-Path $Repo 'tools\rpfm\rpfm_server.exe'
if (-not (Test-Path $Rpfm)) { throw "RPFM not found at $Rpfm. Unzip RPFM into tools\rpfm first." }
$Export = Join-Path $Repo 'unit-export'
$fwd    = { param($p) $p -replace '\\', '/' }

# --- start RPFM server and find its port ---
$proc = Start-Process $Rpfm -PassThru -WindowStyle Hidden
$port = $null
for ($i = 0; $i -lt 30 -and -not $port; $i++) {
    Start-Sleep 1
    $line = netstat -ano | Select-String "LISTENING\s+$($proc.Id)$" | Select-Object -First 1
    if ($line) { $port = ($line -split '\s+')[2].Split(':')[-1] }
}
if (-not $port) { throw 'RPFM server did not start.' }
$url = "http://127.0.0.1:$port/mcp"
$script:sid = $null; $script:id = 0

function Invoke-Mcp($method, $params, [switch]$Notify) {
    $body = @{ jsonrpc = '2.0'; method = $method; params = $params }
    if (-not $Notify) { $script:id++; $body.id = $script:id }
    $h = @{ Accept = 'application/json, text/event-stream' }
    if ($script:sid) { $h['mcp-session-id'] = $script:sid }
    $r = Invoke-WebRequest $url -Method Post -Headers $h -ContentType 'application/json' -UseBasicParsing `
        -Body ([Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 10 -Compress)))
    if ($r.Headers['mcp-session-id']) { $script:sid = $r.Headers['mcp-session-id'] }
    if ($Notify) { return }
    $data = ($r.Content -split "`n" | Where-Object { $_ -like 'data:*' } | ForEach-Object { $_.Substring(5).Trim() } | Where-Object { $_ }) | Select-Object -Last 1
    $msg = $data | ConvertFrom-Json
    if ($msg.error) { throw "$method failed: $($msg.error.message)" }
    $msg.result
}
function Call-Tool($name, $arguments) {
    $res = Invoke-Mcp 'tools/call' @{ name = $name; arguments = $arguments }
    if ($res.isError) { throw "$name failed: $($res.content[0].text)" }
    $res.content[0].text
}

try {
    Invoke-Mcp 'initialize' @{ protocolVersion = '2025-06-18'; capabilities = @{}; clientInfo = @{ name = 'grudgekeeper'; version = '1' } } | Out-Null
    Invoke-Mcp 'notifications/initialized' @{} -Notify

    Write-Host 'Loading Warhammer 3 schema...'
    Call-Tool 'set_game_selected' @{ game_name = 'warhammer_3'; rebuild_dependencies = $false } | Out-Null
    Call-Tool 'update_schemas' @{} | Out-Null
    Call-Tool 'set_game_selected' @{ game_name = 'warhammer_3'; rebuild_dependencies = $false } | Out-Null

    if (Test-Path $Export) { Remove-Item $Export -Recurse -Force }
    New-Item -ItemType Directory $Export | Out-Null

    Write-Host 'Exporting unit tables from db.pack...'
    $db = & $fwd (Join-Path $GameData 'db.pack')
    Call-Tool 'open_packfiles' @{ paths = @($db) } | Out-Null
    Call-Tool 'extract_packed_files' @{ pack_key = $db; destination_path = (& $fwd $Export); export_as_tsv = $true
        source_paths = '{"PackFile":[{"Folder":"db/main_units_tables"},{"Folder":"db/land_units_tables"}]}' } | Out-Null

    Write-Host 'Exporting English text from local_en.pack...'
    $en = & $fwd (Join-Path $GameData 'local_en.pack')
    Call-Tool 'open_packfiles' @{ paths = @($en) } | Out-Null
    Call-Tool 'extract_packed_files' @{ pack_key = $en; destination_path = (& $fwd $Export); export_as_tsv = $true
        source_paths = '{"PackFile":[{"Folder":"text"}]}' } | Out-Null
    $n = (Get-ChildItem $Export -Recurse -Filter *.tsv).Count
    Write-Host "Exported $n TSV files."
}
finally {
    Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
}

Write-Host 'Building unit-lore.json...'
Push-Location $Repo
try { node scripts/build-unit-lore.mjs unit-export unit-lore.json } finally { Pop-Location }
