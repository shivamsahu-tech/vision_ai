# VisionVault: On-Device AI Image Search Engine

## download Url : [https://github.com/shivamsahu-tech/vision_ai/releases/download/vision_ai/vision_ai.apk](https://github.com/shivamsahu-tech/vision_ai/releases/download/vision_ai/vision_ai.apk)

**VisionVault** is a high-performance, privacy-first mobile application built with React Native and Expo that enables semantic image search using fully on-device AI. By integrating advanced machine learning models and vector databases directly into the mobile runtime, VisionVault allows users to search their local image gallery using natural language queries without ever sending data to the cloud.

## 🚀 Key Features

- **Semantic Search**: Search for images using natural language (e.g., "sunset at the beach" or "dog playing in the park") rather than just filenames or tags.
- **100% On-Device Inference**: Utilizes 8-bit quantized ONNX models for both vision and text embeddings, ensuring maximum privacy and offline capability.
- **Vector Search Engine**: Powered by `sqlite-vec`, performing high-speed cosine similarity searches across thousands of locally stored image embeddings.
- **Optimized Performance**: Leverages ONNX Runtime and custom asset interceptors to minimize latency and memory overhead on mobile hardware.

## 🛠️ Technical Architecture

VisionVault implements a modern AI pipeline adapted for the constraints of mobile environments:

### 1. The Embedding Pipeline (CLIP)
The core of the application uses the **CLIP (Contrastive Language-Image Pre-training)** architecture. 
- **Vision Model**: Encodes images into a 512-dimensional vector space.
- **Text Model**: Encodes search queries into the same shared vector space.
- **Quantization**: Models are 8-bit quantized (.ort format) to reduce size and improve inference speed on mobile CPUs/NPUs.

### 2. On-Device Inference Engine
Inference is handled by `onnxruntime-react-native`. 
- **Challenge**: Standard JS-based tokenization often requires network calls to fetch vocabulary.
- **Solution**: Implemented a **Custom Fetch Interceptor** for `@xenova/transformers` that redirects model/tokenizer requests to the local Expo asset system, enabling a strictly air-gapped search experience.

### 3. Vector Database
Instead of a traditional flat-file or purely relational approach, VisionVault uses `@op-engineering/op-sqlite` with the **sqlite-vec** extension.
- **Schema**: Stores image metadata alongside high-dimensional float arrays (embeddings).
- **Indexing**: Uses vector distance functions (Cosine Similarity) directly in SQL queries for sub-millisecond retrieval.

## 💻 Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **AI/ML**: ONNX Runtime, CLIP (Vision/Text Transformers)
- **Database**: SQLite with `sqlite-vec` extension
- **Asset Management**: Expo Asset, Expo FileSystem
- **Build System**: EAS Build (Development Client)

## 🔧 Installation & Setup

### Prerequisites
- Node.js & npm
- [EAS CLI](https://docs.expo.dev/build/setup/) installed globally
- Android/iOS physical device for testing (Native modules required)

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/shivamsahu-tech/vision_ai.git
   cd vision_ai
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a development build (Required for ONNX and SQLite-vec support):
   ```bash
   eas build --profile development --platform android --local
   ```
4. Start the development server:
   ```bash
   npx expo start
   ```

## 🧠 Future Roadmap

- [ ] Implementation of OCR (Optical Character Recognition) for text-in-image searching.
- [ ] Multi-lingual search support using multilingual CLIP variants.
- [ ] Hybrid Search (combining vector similarity with keyword-based FTS5).

---
*Built with ❤️ for privacy and performance.*
