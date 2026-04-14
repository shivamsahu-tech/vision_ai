const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// .ort for ONNX Runtime models, .bytes kept for future use
config.resolver.assetExts.push('ort', 'bytes');

module.exports = config;