// Metro config workspace-aware (Expo official recipe pra monorepo).
// Com .npmrc node-linker=hoisted, pnpm já cria flat node_modules — não
// precisa de disableHierarchicalLookup. Mantemos watchFolders pra HMR de
// packages/* (schemas, design-tokens) funcionar quando edita lá.

const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
