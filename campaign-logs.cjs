// Finds the campaign log files written by the Grudgekeeper logger mod
// (mod/grudgekeeper_logger) and serves them to the app. Used by
// electron-main.js and by the Vite dev server.
//
// The mod writes %APPDATA%\Grudgekeeper\campaign-log-<id>.jsonl, or
// grudgekeeper-campaign-log-<id>.jsonl in the game folder if it can't reach
// %APPDATA%. Game folders are found through Steam's library list.

const fs = require("fs");
const os = require("os");
const path = require("path");

const GAME_FOLDER = path.join("steamapps", "common", "Total War WARHAMMER III");
const LOG_NAME = /^(?:grudgekeeper-)?campaign-log-(.+)\.jsonl$/;

function appDataDir() {
    return process.env.APPDATA ?? (process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : path.join(os.homedir(), ".config"));
}

function steamLibraries() {
    const steamRoots = [
        path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Steam"),
        path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Steam"),
    ];
    const libraries = new Set(steamRoots);
    for (const root of steamRoots) {
        try {
            const vdf = fs.readFileSync(path.join(root, "steamapps", "libraryfolders.vdf"), "utf8");
            for (const match of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
                libraries.add(match[1].replace(/\\\\/g, "\\"));
            }
        } catch (_) { /* no Steam here */ }
    }
    return [...libraries];
}

function logFolders() {
    const folders = [path.join(appDataDir(), "Grudgekeeper")];
    for (const library of steamLibraries()) {
        const game = path.join(library, GAME_FOLDER);
        if (fs.existsSync(game)) folders.push(game);
    }
    if (process.env.GRUDGEKEEPER_LOG_DIR) folders.push(process.env.GRUDGEKEEPER_LOG_DIR);
    return folders;
}

// Faction name and start time from the log's "start" line, for the picker.
function readStart(file) {
    try {
        const fd = fs.openSync(file, "r");
        const buffer = Buffer.alloc(8192);
        const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);
        for (const line of buffer.toString("utf8", 0, bytes).split("\n")) {
            try {
                const e = JSON.parse(line);
                if (e.t === "start") return { factionName: e.faction_name ?? e.faction, startedAt: e.at };
            } catch (_) { /* unit names or a partial line */ }
        }
    } catch (_) { /* unreadable */ }
    return {};
}

// [{ id, file, size, modified, factionName, startedAt }] newest first. A campaign found in two
// folders keeps the most recently written file.
function listCampaignLogs() {
    const byId = new Map();
    for (const folder of logFolders()) {
        let names = [];
        try { names = fs.readdirSync(folder); } catch (_) { continue; }
        for (const name of names) {
            const match = LOG_NAME.exec(name);
            if (!match) continue;
            const file = path.join(folder, name);
            const stat = fs.statSync(file);
            const entry = { id: match[1], file, size: stat.size, modified: stat.mtimeMs };
            const existing = byId.get(entry.id);
            if (!existing || existing.modified < entry.modified) byId.set(entry.id, entry);
        }
    }
    return [...byId.values()]
        .map((entry) => ({ ...entry, ...readStart(entry.file) }))
        .sort((a, b) => b.modified - a.modified);
}

// Express/Connect handler for /local/campaign-logs and /local/campaign-logs/<id>.
function campaignLogsHandler(req, res) {
    const id = decodeURIComponent((req.url ?? "").split("?")[0].replace(/^\/+/, ""));
    res.setHeader("Cache-Control", "no-store");
    const logs = listCampaignLogs();
    if (!id) {
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify(logs.map(({ file, ...info }) => info)));
    }
    const log = logs.find((l) => l.id === id);
    if (!log) { res.statusCode = 404; return res.end(); }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    fs.createReadStream(log.file).pipe(res);
}

module.exports = { listCampaignLogs, campaignLogsHandler, logFolders };
