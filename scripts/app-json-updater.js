/**
 * Custom updater per standard-version.
 * Aggiorna version in app.json (Expo)
 */
module.exports.readVersion = function (contents) {
  const json = JSON.parse(contents);
  return json.expo?.version || "0.0.0";
};

module.exports.writeVersion = function (contents, version) {
  const json = JSON.parse(contents);
  json.expo.version = version;
  return JSON.stringify(json, null, 2) + "\n";
};
