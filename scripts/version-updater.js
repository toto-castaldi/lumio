/**
 * Custom updater per standard-version.
 * Aggiorna VERSION in version.ts
 */
const versionRegex = /export const VERSION = "(.+)";/;

module.exports.readVersion = function (contents) {
  const match = contents.match(versionRegex);
  if (!match) {
    throw new Error("Could not find VERSION in version.ts");
  }
  return match[1];
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(versionRegex, `export const VERSION = "${version}";`);
};
