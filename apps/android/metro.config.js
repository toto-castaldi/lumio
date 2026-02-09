const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  // Workspace transitive deps (e.g. @lumio/shared via @lumio/core)
  path.resolve(monorepoRoot, 'packages/core/node_modules'),
];

// Ensure proper resolution of workspace packages
config.resolver.disableHierarchicalLookup = true;

// Server-only modules from @lumio/core (rehype-katex chain) that aren't
// needed in React Native. Redirect to empty module to avoid bundling errors.
const emptyModule = require.resolve(
  path.resolve(projectRoot, 'empty-module.js')
);
const serverOnlyPackages = [
  'rehype-katex',
  'hast-util-from-html-isomorphic',
  'hast-util-from-html',
  'parse5',
  'entities',
];

// pnpm hoists trim-newlines v3 to root but react-native-code-highlighter
// needs v5 (ESM named exports). Force resolution to v5.
const trimNewlinesV5 = path.resolve(
  monorepoRoot,
  'node_modules/.pnpm/trim-newlines@5.0.0/node_modules/trim-newlines/index.js',
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (serverOnlyPackages.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return { filePath: emptyModule, type: 'sourceFile' };
  }
  if (moduleName === 'trim-newlines') {
    return { filePath: trimNewlinesV5, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
