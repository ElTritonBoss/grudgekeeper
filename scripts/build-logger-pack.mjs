// Builds the campaign logger mod into a Warhammer III .pack file.
//
// Usage: node scripts/build-logger-pack.mjs [output.pack]
// Default output: mod/dist/grudgekeeper_logger.pack
//
// Every file under mod/grudgekeeper_logger/ goes into the pack at the same
// relative path (e.g. script/campaign/mod/grudgekeeper_logger.lua). The pack
// is an uncompressed PFH5 "mod" pack, the format WH3 uses, laid out as RPFM
// writes it (rpfm_lib/src/files/pack/pack_versions/pfh5.rs).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "mod", "grudgekeeper_logger");
const output = path.resolve(process.argv[2] ?? path.join(root, "mod", "dist", "grudgekeeper_logger.pack"));

const PACK_TYPE_MOD = 3;

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

export function buildPack(files) {
  // The game expects backslash paths, sorted case-insensitively.
  const sorted = [...files].sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));

  const index = [];
  for (const { path: p, data } of sorted) {
    const name = Buffer.from(p.replace(/\//g, "\\"), "utf8");
    const entry = Buffer.alloc(4 + 1 + name.length + 1);
    entry.writeUInt32LE(data.length, 0); // file size
    entry.writeUInt8(0, 4);              // not compressed
    name.copy(entry, 5);                 // path, null-terminated
    index.push(entry);
  }
  const indexBytes = Buffer.concat(index);

  const header = Buffer.alloc(24);
  header.write("PFH5", 0, "ascii");
  header.writeUInt32LE(PACK_TYPE_MOD, 4);        // pack type, no flags
  header.writeUInt32LE(0, 8);                    // dependency count
  header.writeUInt32LE(0, 12);                   // dependency index size
  header.writeUInt32LE(sorted.length, 16);       // file count
  header.writeUInt32LE(indexBytes.length, 20);   // file index size
  const timestamp = Buffer.alloc(4);
  timestamp.writeUInt32LE(Math.floor(Date.now() / 1000), 0);

  return Buffer.concat([header, timestamp, indexBytes, ...sorted.map((f) => f.data)]);
}

export function readPack(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "PFH5") throw new Error("not a PFH5 pack");
  const type = buffer.readUInt32LE(4);
  const depCount = buffer.readUInt32LE(8);
  const depSize = buffer.readUInt32LE(12);
  const fileCount = buffer.readUInt32LE(16);
  const indexSize = buffer.readUInt32LE(20);
  if (depCount !== 0) throw new Error("dependencies not supported");
  let pos = 28 + depSize;
  let dataPos = 28 + depSize + indexSize;
  const files = [];
  for (let i = 0; i < fileCount; i++) {
    const size = buffer.readUInt32LE(pos);
    const compressed = buffer.readUInt8(pos + 4);
    const end = buffer.indexOf(0, pos + 5);
    const p = buffer.toString("utf8", pos + 5, end);
    pos = end + 1;
    files.push({ path: p, compressed, data: buffer.subarray(dataPos, dataPos + size) });
    dataPos += size;
  }
  if (dataPos !== buffer.length) throw new Error("pack size mismatch");
  return { type, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = listFiles(sourceDir).map((full) => ({
    path: path.relative(sourceDir, full).split(path.sep).join("/"),
    data: fs.readFileSync(full),
  }));
  const pack = buildPack(files);
  readPack(pack); // sanity check
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, pack);
  console.log(`Wrote ${output} (${files.length} file(s), ${pack.length} bytes)`);
  for (const f of files) console.log(`  ${f.path}`);
}
