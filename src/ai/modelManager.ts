import { Asset } from 'expo-asset';
import { InferenceSession } from 'onnxruntime-react-native';

// Hold the sessions in private memory
let visionSession: InferenceSession | null = null;
let textSession: InferenceSession | null = null;

// Initialize function (Call this ONCE in your App.tsx or Splash Screen)
export const initializeLocalModels = async (): Promise<void> => {
  if (visionSession && textSession) {
    console.log('✅ Models already in memory.');
    return;
  }

  try {
    console.log('Starting model initialization...');

    const visionAsset = await Asset.loadAsync(
      require('../../assets/models/vision_model.ort') as number
    );
    const textAsset = await Asset.loadAsync(
      require('../../assets/models/text_model.ort') as number
    );

    const visionModelUri = visionAsset[0].localUri || visionAsset[0].uri;
    const textModelUri = textAsset[0].localUri || textAsset[0].uri;

    if (!visionModelUri || !textModelUri) {
      throw new Error('Failed to resolve physical URIs for the ORT models.');
    }

    visionSession = await InferenceSession.create(visionModelUri);
    textSession = await InferenceSession.create(textModelUri);

    console.log('✅ Both 8-bit ORT models successfully loaded!');
  } catch (error) {
    console.error('❌ Failed to load ONNX models:', error);
    throw error;
  }
};

// Safe Getters for your other files
export const getVisionSession = (): InferenceSession => {
  if (!visionSession) {
    throw new Error('Vision session is null. Call initializeLocalModels() first.');
  }
  return visionSession;
};

export const getTextSession = (): InferenceSession => {
  if (!textSession) {
    throw new Error('Text session is null. Call initializeLocalModels() first.');
  }
  return textSession;
};