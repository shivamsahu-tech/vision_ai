import { open, QueryResult } from '@op-engineering/op-sqlite';
import { Tensor } from 'onnxruntime-react-native';
import { getTextSession } from '../ai/modelManager';
import { AutoTokenizer, env } from '@xenova/transformers';
import { Buffer } from 'buffer';

// ---------------------------------------------------------------------------
// HOW THIS WORKS:
// @xenova/transformers resolves model files via its `customCache` hook.
// In React Native, the global fetch() cannot load local file:// paths, so
// the library's own file-loading path fails.  The fix: put JSON back in
// Metro's sourceExts (its default), so require() returns the parsed JS object
// synchronously.  We JSON.stringify() it once at module load, then serve the
// string from customCache.match() — zero networking, zero async file I/O.
// ---------------------------------------------------------------------------

// Synchronously populate the tokenizer content map at module-load time.
// require() returns the parsed JS object when JSON is in Metro sourceExts.
const _tokenizerData: Record<string, string> = {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  'tokenizer.json': JSON.stringify(require('../../assets/models/tokenizer.json')),
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  'tokenizer_config.json': JSON.stringify(require('../../assets/models/tokenizer_config.json')),
};

console.log('[Transformers] Tokenizer data loaded synchronously at module init.');

// Configure transformers for offline-only use
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.backends.onnx.wasm.wasmPaths = {};

// Serve tokenizer files from the in-memory map — no network needed
env.useCustomCache = true;
env.customCache = {
  match: async (request: string) => {
    const isTokenizer = request.endsWith('tokenizer.json') && !request.endsWith('tokenizer_config.json');
    const isConfig = request.endsWith('tokenizer_config.json');
    const key = isTokenizer ? 'tokenizer.json' : isConfig ? 'tokenizer_config.json' : null;

    if (key && _tokenizerData[key]) {
      console.log(`[Transformers] ✅ Serving from module cache: ${key}`);
      const fileData = _tokenizerData[key];
      return {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => {
          const buf = Buffer.from(fileData, 'utf-8');
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        },
      } as any;
    }

    return undefined; // Not a tokenizer file — let library handle it
  },
  put: async () => { return; },
};

// No-op kept for API compatibility — loading is now synchronous at module init
export const initializeTokenizerAssets = async (): Promise<void> => {
  console.log('[Transformers] ✅ Tokenizer assets already loaded (synchronous module init).');
};

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

    console.log('Tokenization complete:', tokenized);

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
    
    // 5. Execute Vector Search — all results, most relevant first
    // Cosine distance: lower value = more similar, so ASC = best match at top
    const dbResult: QueryResult = await db.execute(`
      SELECT 
        images.uri,
        vec_distance_cosine(image_vectors.embedding, ?) AS distance
      FROM image_vectors
      JOIN images ON images.id = image_vectors.image_id
      ORDER BY distance ASC
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