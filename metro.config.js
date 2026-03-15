const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Explicitly tell Metro to bundle .ort and .json files into the final APK/IPA
config.resolver.assetExts.push('ort', 'json');

module.exports = config;