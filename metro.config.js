const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
config.resolver.unstable_conditionNames = ['require', 'node', 'default'];
config.transformer.babelTransformerPath = path.resolve(__dirname, 'metro.transformer.js');

module.exports = config;
