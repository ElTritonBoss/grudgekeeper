import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const { campaignLogsHandler } = createRequire(import.meta.url)("./campaign-logs.cjs");

// Same location electron-main.js serves the local game-data files from.
const appData = process.env.APPDATA ?? (process.platform === "darwin"
  ? path.join(os.homedir(), "Library", "Application Support")
  : path.join(os.homedir(), ".config"));
const localDir = path.join(appData, "Grudgekeeper");

function localGameData() {
  return {
    name: "local-game-data",
    configureServer(server) {
      ["unit-lore.json", "lord-details.json"].forEach((name) => {
        server.middlewares.use(`/local/${name}`, (req, res) => {
          const file = path.join(localDir, name);
          if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
          res.setHeader("Content-Type", "application/json");
          fs.createReadStream(file).pipe(res);
        });
      });
      server.middlewares.use("/local/campaign-logs", campaignLogsHandler);
    },
  };
}

export default defineConfig({
  plugins: [react(), localGameData()],
  base: "./",
});
