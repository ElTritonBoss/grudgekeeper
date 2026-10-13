import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Same location electron-main.js serves the unit lore file from.
const appData = process.env.APPDATA ?? (process.platform === "darwin"
  ? path.join(os.homedir(), "Library", "Application Support")
  : path.join(os.homedir(), ".config"));
const unitLoreFile = path.join(appData, "Grudgekeeper", "unit-lore.json");

function localUnitLore() {
  return {
    name: "local-unit-lore",
    configureServer(server) {
      server.middlewares.use("/local/unit-lore.json", (req, res) => {
        if (!fs.existsSync(unitLoreFile)) { res.statusCode = 404; return res.end(); }
        res.setHeader("Content-Type", "application/json");
        fs.createReadStream(unitLoreFile).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localUnitLore()],
  base: "./",
});
