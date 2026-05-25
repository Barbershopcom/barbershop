// Metro config workspace-aware (Expo official recipe pra monorepo pnpm).
// Sem isso, pnpm pode resolver expo/react-native em 2 locais (peer deps com hash
// diferente), e o app crasha com 'getDevServer is not a function'.

const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1) Watch monorepo inteiro (mudanças em packages/* triggeram rebuild)
config.watchFolders = [workspaceRoot];

// 2) Resolver procura primeiro local, depois raiz — mas SEM walking up
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3) Sem hierarchical lookup — força resolução única (sem duplicates)
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
