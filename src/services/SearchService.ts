import { open, QueryResult } from '@op-engineering/op-sqlite';
import { Tensor } from 'onnxruntime-react-native';
import { getTextSession } from '../ai/modelManager';
import { AutoTokenizer, env } from '@xenova/transformers';

// Configure transformers to stay in-memory/cache only
env.allowLocalModels = false; 
env.backends.onnx.wasm.wasmPaths = {};

const db = open({ name: 'vision_vault.sqlite' });

export interface SearchResult {
  uri: string;
  distance: number;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

// Singleton to prevent reloading vocab on every keystroke
let tokenizer: any = null;

export const SearchFunction = async (searchQuery: string): Promise<SearchResponse> => {
  try {
    const textSession = getTextSession();
    
    if (!searchQuery.trim()) return { success: true, results: [] };
    console.log(`🔍 Searching for: "${searchQuery}"`);

    // 1. Safe Tokenizer Initialization
    if (!tokenizer) {
      console.log('Loading tokenizer...');
      tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
    }

    // 2. Tokenize Input
    const tokenized = await tokenizer(searchQuery, {
      padding: true,
      truncation: true,
    });

    // 3. THE CRASH FIX: Standard Array + BigInt 
    // We avoid 'new BigInt64Array()' because it crashes the Hermes bridge on many Android devices.
    // Instead, we pass a plain array of BigInts; the C++ layer handles the packing.
    const rawIds = Array.from(tokenized.input_ids.data as number[]);
    const bigIntIds = rawIds.map(id => BigInt(id));

    const inputTensor = new Tensor(
      'int64', 
      bigIntIds as unknown as BigInt64Array, // Type cast to satisfy TS; runtime uses plain array
      [1, bigIntIds.length]
    );

    // 4. Run the ONNX Text Model
    const results = await textSession.run({ input_ids: inputTensor });
    const outputKey = Object.keys(results)[0]; 
    const textEmbeddingArray = Array.from(results[outputKey].data as Float32Array);
    
    // 5. Execute Vector Search
    // Use cosine distance for similarity
    const dbResult: QueryResult = await db.execute(`
      SELECT 
        images.uri,
        vec_distance_cosine(image_vectors.embedding, ?) AS distance
      FROM image_vectors
      JOIN images ON images.id = image_vectors.image_id
      ORDER BY distance ASC
      LIMIT 10
    `, [JSON.stringify(textEmbeddingArray)]);

    if (dbResult.rows && dbResult.rows.length > 0) {
      const formattedResults: SearchResult[] = dbResult.rows.map((row: any) => ({
        uri: String(row.uri),
        distance: Number(row.distance)
      }));

      return { success: true, results: formattedResults };
    }

    return { success: true, results: [] };

  } catch (error: any) {
    // This will now catch native errors without closing the app
    console.error('❌ Search Pipeline Error:', error);
    return { success: false, results: [], error: error.message };
  }
};