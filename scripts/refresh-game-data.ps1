# Re-export the game tables from your Warhammer III install and rebuild
# unit-lore.json and lord-details.json in one go.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File C:\Users\Nelson\grudgekeeper-src\scripts\refresh-game-data.ps1
# Game files are only read; nothing is saved back to them. The exports and the
# two JSON files are game text (CA / GW): they stay on this PC and are gitignored.
# Both files are written to %APPDATA%\Grudgekeeper, where the app loads them on its own.
#
# Mods: by default the mods enabled in the launcher (used_mods.txt next to Warhammer3.exe) are
# exported too and merged over the vanilla tables in load order, the way the game does, so an
# overhaul like SFO shows its own skills, stats and units. -Vanilla ignores mods; -ModPacks takes
# explicit .pack paths instead (highest priority first).

param(
    [string]$GameData = 'S:\SteamLibrary\steamapps\common\Total War WARHAMMER III\data',
    [string]$Repo     = (Split-Path $PSScriptRoot -Parent),
    [string]$Rpfm     = '',
    [switch]$SkipExport,
    [string[]]$ModPacks,
    [switch]$Vanilla
)
$ErrorActionPreference = 'Stop'
if (-not $Rpfm) { $Rpfm = Join-Path $Repo 'tools\rpfm\rpfm_server.exe' }
if (-not (Test-Path $Rpfm)) { $Rpfm = 'C:\Users\Nelson\grudgekeeper-src\tools\rpfm\rpfm_server.exe' }
$UnitExport = Join-Path $Repo 'unit-export'
$LordExport = Join-Path $Repo 'lord-export'
$ModExport  = Join-Path $Repo 'mod-export'

# Enabled mods, in load order, from the launcher's used_mods.txt.
function Get-UsedMods($gameDir) {
    $file = Join-Path $gameDir 'used_mods.txt'
    if (-not (Test-Path $file)) { return @() }
    $dirs = @((Join-Path $gameDir 'data'))
    $packs = @()
    foreach ($line in Get-Content $file) {
        if ($line -match '^\s*add_working_directory\s+"([^"]+)"') { $dirs += $Matches[1] }
        elseif ($line -match '^\s*mod\s+"([^"]+)"') {
            $name = $Matches[1]
            $hit = $dirs | ForEach-Object { Join-Path $_ $name } | Where-Object { Test-Path $_ } | Select-Object -First 1
            if ($hit) { $packs += $hit } else { Write-Host "  (enabled mod $name not found, skipped)" }
        }
    }
    $packs
}
if ($Vanilla) { $ModPacks = @() }
elseif (-not $ModPacks) { $ModPacks = @(Get-UsedMods (Split-Path $GameData -Parent)) }
if ($ModPacks) { Write-Host ("Mods, in load order: " + (($ModPacks | ForEach-Object { Split-Path $_ -Leaf }) -join ', ')) }
else { Write-Host 'No mods: building from the vanilla tables.' }
$fwd = { param($p) $p -replace '\\', '/' }

# Tables lord-details.json needs (db.pack holds the DLC tables too in Warhammer III).
$LordTables = @(
    'agent_subtypes', 'character_skill_node_sets', 'character_skill_nodes', 'character_skills',
    'character_skill_level_to_effects_junctions', 'effects', 'effect_bonus_value_unit_set_unit_ability_junctions',
    'effect_bonus_value_unit_set_unit_attribute_junctions', 'effect_bonus_value_unit_set_junctions',
    'effect_bonus_value_unit_record_junctions', 'effect_bonus_value_unit_list_junctions',
    'effect_bonus_value_ids_unit_sets', 'unit_sets', 'unit_set_to_unit_junctions', 'unique_agents',
    'faction_agent_permitted_subtypes', 'main_units', 'land_units', 'factions', 'cultures_subcultures',
    'character_skill_node_set_items', 'character_skill_nodes_skill_locks', 'unit_set_unit_ability_junctions',
    'unit_set_unit_attribute_junctions', 'frontend_faction_leaders', 'campaign_rituals', 'building_levels',
    'unit_abilities', 'unit_attributes', 'campaign_character_arts',
    'ancillaries', 'ancillary_to_effects', 'ancillaries_included_agent_subtypes', 'character_ancillary_quest_ui_details',
    'ancillary_sets', 'ancillary_set_ancillary_junctions', 'ancillary_set_effect_junctions', 'faction_starting_general_effects',
    'effect_bundles', 'effect_bundles_to_effects_junctions', 'land_units_to_unit_abilites_junctions',
    'units_to_exclusive_faction_permissions'
)

if (-not $SkipExport) {
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
    function Export-Folders($pack, $folders, $dest) {
        $list = ($folders | ForEach-Object { '{"Folder":"' + $_ + '"}' }) -join ','
        Call-Tool 'extract_packed_files' @{ pack_key = $pack; destination_path = (& $fwd $dest); export_as_tsv = $true
            source_paths = '{"PackFile":[' + $list + ']}' } | Out-Null
    }

    try {
        Invoke-Mcp 'initialize' @{ protocolVersion = '2025-06-18'; capabilities = @{}; clientInfo = @{ name = 'grudgekeeper'; version = '1' } } | Out-Null
        Invoke-Mcp 'notifications/initialized' @{} -Notify

        Write-Host 'Loading Warhammer 3 schema...'
        Call-Tool 'set_game_selected' @{ game_name = 'warhammer_3'; rebuild_dependencies = $false } | Out-Null
        Call-Tool 'update_schemas' @{} | Out-Null
        Call-Tool 'set_game_selected' @{ game_name = 'warhammer_3'; rebuild_dependencies = $false } | Out-Null

        foreach ($dir in $UnitExport, $LordExport, $ModExport) {
            if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
            New-Item -ItemType Directory $dir | Out-Null
        }

        $db = & $fwd (Join-Path $GameData 'db.pack')
        Call-Tool 'open_packfiles' @{ paths = @($db) } | Out-Null
        Write-Host 'Exporting unit tables from db.pack...'
        Export-Folders $db @('db/main_units_tables', 'db/land_units_tables') $UnitExport
        Write-Host 'Exporting skill, effect and hero tables from db.pack...'
        foreach ($t in $LordTables) {
            try { Export-Folders $db @("db/${t}_tables") $LordExport }
            catch { Write-Host "  (no db/${t}_tables in db.pack, skipped)" }
        }

        Write-Host 'Exporting English text from local_en.pack...'
        $en = & $fwd (Join-Path $GameData 'local_en.pack')
        Call-Tool 'open_packfiles' @{ paths = @($en) } | Out-Null
        Export-Folders $en @('text') $UnitExport
        Export-Folders $en @('text') $LordExport

        Write-Host 'Exporting campaign scripts from data_script.pack (for hero unlocks)...'
        $scr = & $fwd (Join-Path $GameData 'data_script.pack')
        Call-Tool 'open_packfiles' @{ paths = @($scr) } | Out-Null
        try { Export-Folders $scr @('script') $LordExport } catch { Write-Host "  (campaign scripts not readable: $_)" }

        $i = 0
        foreach ($mod in $ModPacks) {
            $i++
            $leaf = [IO.Path]::GetFileNameWithoutExtension($mod)
            $dest = Join-Path $ModExport ('{0:D2}-{1}' -f $i, $leaf)
            New-Item -ItemType Directory $dest | Out-Null
            Write-Host "Exporting tables and text from mod $leaf..."
            $mp = & $fwd $mod
            Call-Tool 'open_packfiles' @{ paths = @($mp) } | Out-Null
            try { Export-Folders $mp @('db') $dest } catch { Write-Host "  (no db tables in $leaf)" }
            try { Export-Folders $mp @('text') $dest } catch { Write-Host "  (no text in $leaf)" }
        }

        $n = (Get-ChildItem $UnitExport, $LordExport, $ModExport -Recurse -Filter *.tsv).Count
        Write-Host "Exported $n TSV files."
    }
    finally {
        Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
    }
}

Push-Location $Repo
try {
    $unitIn = 'unit-export'; $lordIn = 'lord-export'
    $modDirs = @()
    if (-not $Vanilla -and (Test-Path $ModExport)) {
        $modDirs = @(Get-ChildItem $ModExport -Directory | Sort-Object Name | ForEach-Object { $_.FullName })
    }
    if ($modDirs) {
        Write-Host 'Merging mod tables over the vanilla unit tables...'
        node scripts/merge-mod-tables.mjs unit-export unit-export-merged @modDirs
        if ($LASTEXITCODE) { throw 'Merging the unit tables failed.' }
        Write-Host 'Merging mod tables over the vanilla lord tables...'
        node scripts/merge-mod-tables.mjs lord-export lord-export-merged @modDirs
        if ($LASTEXITCODE) { throw 'Merging the lord tables failed.' }
        $unitIn = 'unit-export-merged'; $lordIn = 'lord-export-merged'
    }
    Write-Host 'Building unit-lore.json...'
    node scripts/build-unit-lore.mjs $unitIn
    Write-Host 'Building lord-details.json...'
    node scripts/build-lord-details.mjs $lordIn
} finally { Pop-Location }
