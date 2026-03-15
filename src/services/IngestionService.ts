import { open, Transaction, QueryResult } from '@op-engineering/op-sqlite';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
import { Tensor } from 'onnxruntime-react-native';
import { getVisionSession } from '../ai/modelManager';

const db = open({ name: 'vision_vault.sqlite' });

// ---------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------
export interface DatabaseSetupResult {
  success: boolean;
  error?: string;
}

export interface IngestionResult {
  success: boolean;
  insertedId?: number;
  error?: string;
}

// ---------------------------------------------------------
// DATABASE INITIALIZATION
// ---------------------------------------------------------
export const setupDatabase = async (): Promise<DatabaseSetupResult> => {
  try {
    // 1. Changed executeAsync to execute
    await db.execute(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uri TEXT NOT NULL
      );
    `);

    // 2. Changed executeAsync to execute
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS image_vectors USING vec0(
        image_id INTEGER PARTITION KEY,
        embedding float[512]
      );
    `);
    console.log('✅ SQLite Vector Database initialized');
    return { success: true };
  } catch (error: any) {
    console.error('❌ DB Setup Failed:', error);
    return { success: false, error: error.message };
  }
};

// ---------------------------------------------------------
// IMAGE PREPROCESSING
// ---------------------------------------------------------
const preprocessImage = async (imageUri: string): Promise<Tensor> => {
  const width = 224;
  const height = 224;

  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width, height } }],
    { format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (!resized.base64) throw new Error('Failed to extract base64 from image');

  const rawImageData = jpeg.decode(Buffer.from(resized.base64, 'base64'), { useTArray: true });
  const float32Data = new Float32Array(3 * width * height);
  const mean = [0.48145466, 0.4578275, 0.40821073];
  const std = [0.26862954, 0.26130258, 0.27577711];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rawImageData.data[i] / 255.0;
      const g = rawImageData.data[i + 1] / 255.0;
      const b = rawImageData.data[i + 2] / 255.0;

      float32Data[y * width + x] = (r - mean[0]) / std[0];
      float32Data[width * height + y * width + x] = (g - mean[1]) / std[1];
      float32Data[2 * width * height + y * width + x] = (b - mean[2]) / std[2];
    }
  }

  return new Tensor('float32', float32Data, [1, 3, width, height]);
};

// ---------------------------------------------------------
// INGESTION PIPELINE
// ---------------------------------------------------------
export const IngestionFunction = async (imageUri: string): Promise<IngestionResult> => {
  try {
    const visionSession = getVisionSession();
    const inputTensor: Tensor = await preprocessImage(imageUri);

    const results = await visionSession.run({ pixel_values: inputTensor });
    const outputKey = Object.keys(results)[0];
    const embeddingArray = Array.from(results[outputKey].data as Float32Array);
    const vectorString = JSON.stringify(embeddingArray);

    let finalInsertedId: number | undefined;

    // The transaction callback explicitly returns Promise<void>
    // and correctly awaits the tx.execute Promises
    await db.transaction(async (tx: Transaction): Promise<void> => {
      const result: QueryResult = await tx.execute(
        'INSERT INTO images (uri) VALUES (?)',
        [imageUri]
      );

      if (result.insertId !== undefined) {
        finalInsertedId = result.insertId;
        await tx.execute(
          'INSERT INTO image_vectors (image_id, embedding) VALUES (?, ?)',
          [result.insertId, vectorString]
        );
      }
    });

    console.log(`✅ Ingestion complete for ID: ${finalInsertedId}`);
    return { success: true, insertedId: finalInsertedId };

  } catch (error: any) {
    console.error('❌ Ingestion failed:', error);
    return { success: false, error: error.message };
  }
};

export const getAllImages = async (): Promise<any[]> => {
  try {
    const result: QueryResult = await db.execute('SELECT * FROM images ORDER BY id DESC');
    return result.rows || [];
  } catch (error) {
    console.error('❌ Failed to fetch images:', error);
    return [];
  }
};

export const deleteImageFromDb = async (id: number): Promise<boolean> => {
  try {
    await db.transaction(async (tx: Transaction): Promise<void> => {
      await tx.execute('DELETE FROM images WHERE id = ?', [id]);
      await tx.execute('DELETE FROM image_vectors WHERE image_id = ?', [id]);
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete image ${id}:`, error);
    return false;
  }
};