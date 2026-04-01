#!/usr/bin/env node
"use strict";
/**
 * Dev launcher — removes ELECTRON_RUN_AS_NODE from the environment before
 * starting electron-vite, preventing Electron from running in bare Node.js
 * mode if the variable was inadvertently set in the host shell.
 */
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawnSync } = require("child_process");
const path = require("path");

const electronVite = path.join(
  __dirname,
  "../node_modules/.bin/electron-vite"
);

const result = spawnSync(electronVite, ["dev"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 0);
