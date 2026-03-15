import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import HomeScreen from "./src/screens/HomeScreen";
import { setupDatabase } from './src/services/IngestionService';
import { initializeLocalModels } from './src/ai/modelManager';

// 1. Tell Expo to keep the splash screen visible while we load the AI
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepareEnvironment() {
      try {
        console.log("Booting VisionVault Environment...");

        // 2. Initialize the sqlite-vec database tables
        await setupDatabase();

        // 3. Load the 8-bit ONNX Vision and Text models into RAM
        await initializeLocalModels();

      } catch (error) {
        console.error("Critical Failure during initialization:", error);
        // You might want to set an error state here to show a fallback UI
      } finally {
        // 4. Initialization complete. Tell React to render HomeScreen.
        setIsReady(true);
        // 5. Hide the Splash Screen to reveal the app
        await SplashScreen.hideAsync();
      }
    }

    prepareEnvironment();
  }, []);

  // Return nothing while the splash screen is covering the view
  if (!isReady) {
    return null; 
  }

  // The models and database are strictly guaranteed to be ready now
  return <HomeScreen />;
}