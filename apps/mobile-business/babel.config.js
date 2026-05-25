module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // react-native-worklets/plugin é REQUERIDO pelo reanimated 4 — e DEVE ser
    // o último item da lista (plugins rodam em ordem reversa, esse precisa ser
    // o primeiro a transformar).
    plugins: ['react-native-worklets/plugin'],
  };
};
