#!/usr/bin/env node
/**
 * Post-bump script.
 * Eseguito dopo standard-version per sincronizzare la versione.
 */
const fs = require("fs");
const path = require("path");

// Legge versione da shared
const versionFilePath = path.join(__dirname, "../packages/shared/src/version.ts");
const versionFile = fs.readFileSync(versionFilePath, "utf8");
const match = versionFile.match(/VERSION = "(.+)"/);

if (!match) {
  console.error("Could not read VERSION from version.ts");
  process.exit(1);
}

const version = match[1];
console.log(`Version: ${version}`);

// Verifica che app.json sia sincronizzato (dovrebbe già esserlo da standard-version)
const appJsonPath = path.join(__dirname, "../apps/mobile/app.json");
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
  if (appJson.expo.version !== version) {
    appJson.expo.version = version;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
    console.log(`Synced version to apps/mobile/app.json`);
  } else {
    console.log(`apps/mobile/app.json already in sync`);
  }
}

console.log(`\nReady to push: git push --follow-tags origin main`);
