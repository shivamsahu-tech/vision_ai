const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// 1. Move 'json' from sourceExts to assetExts
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'json');
config.resolver.assetExts.push('json', 'ort');

module.exports = config;