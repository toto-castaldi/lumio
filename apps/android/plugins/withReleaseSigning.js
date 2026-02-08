const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Expo config plugin that configures Android release signing and dynamic versioning.
 *
 * Adds a release signingConfig that reads keystore credentials from environment
 * variables, with fallbacks to debug keystore values for local development.
 *
 * Makes versionCode and versionName injectable via Gradle properties
 * (-PversionCode=N -PversionName=X.Y.Z) for CI builds.
 */
function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // 1. Add release signingConfig after the debug signingConfig block
    if (!buildGradle.includes('signingConfigs.release')) {
      // Find the debug signing config closing brace and add release after it
      const debugSigningEnd = buildGradle.match(
        /signingConfigs\s*\{[^}]*debug\s*\{[^}]*\}/
      );
      if (debugSigningEnd) {
        const insertPoint = debugSigningEnd.index + debugSigningEnd[0].length;
        const releaseSigningConfig = `
        release {
            storeFile file('release.keystore')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: 'android'
            keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: 'androiddebugkey'
            keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: 'android'
        }`;
        buildGradle =
          buildGradle.slice(0, insertPoint) +
          releaseSigningConfig +
          buildGradle.slice(insertPoint);
      }

      // 2. Update release buildType to use signingConfigs.release instead of .debug
      // Find the buildTypes block, then within it find the release block's signingConfig
      // Use line-by-line replacement: find "Caution!" comment (marks release block),
      // then replace the signingConfig on the next line
      const lines = buildGradle.split('\n');
      let inBuildTypes = false;
      let inReleaseBuildType = false;
      let braceDepth = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^\s*buildTypes\s*\{/)) {
          inBuildTypes = true;
          continue;
        }
        if (inBuildTypes && lines[i].match(/^\s*release\s*\{/)) {
          inReleaseBuildType = true;
          continue;
        }
        if (inReleaseBuildType && lines[i].includes('signingConfig signingConfigs.debug')) {
          lines[i] = lines[i].replace('signingConfigs.debug', 'signingConfigs.release');
          break;
        }
      }
      buildGradle = lines.join('\n');
    }

    // 3. Make versionCode dynamic via Gradle properties
    if (!buildGradle.includes("findProperty('versionCode')")) {
      buildGradle = buildGradle.replace(
        /versionCode\s+\d+/,
        "versionCode (findProperty('versionCode') ?: 1).toInteger()"
      );
    }

    // 4. Make versionName dynamic via Gradle properties
    if (!buildGradle.includes("findProperty('versionName')")) {
      buildGradle = buildGradle.replace(
        /versionName\s+"[^"]+"/,
        'versionName findProperty(\'versionName\') ?: "1.0.0"'
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });
}

module.exports = withReleaseSigning;
