import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SearchBar from '../components/SearchBar';
import GalleryGrid from '../components/GalleryGrid';
import CameraModal from '../components/CameraModal';
import { useGallery } from '../hooks/useGallery';
import { StatusBar } from 'expo-status-bar';
import ImageView from 'react-native-image-viewing';
import SimpleToast, { SimpleToastHandle } from '../components/SimpleToast';

const HomeScreen: React.FC = () => {
    const {
        displayImages,
        searchQuery,
        isSearching,
        isIngesting,
        isRefreshing,
        updateSearchQuery,
        performSearch,
        handleIngest,
        handleDelete,
        clearSearch,
        refreshGallery
    } = useGallery();

    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [numColumns, setNumColumns] = useState(3);
    const toastRef = useRef<SimpleToastHandle>(null);

    const onCapture = async (uri: string) => {
        setIsCameraVisible(false);
        toastRef.current?.show('Processing image...', 'loading');
        const result = await handleIngest(uri);
        if (result?.success) {
            toastRef.current?.show('Image added successfully!', 'success');
        } else {
            toastRef.current?.show('Failed to add image', 'error');
        }
    };

    const confirmDelete = (id: string) => {
        Alert.alert(
            "Delete Image",
            "Are you sure you want to remove this image from your vault?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const result = await handleDelete(id);
                        if (result.success) {
                            toastRef.current?.show('Image deleted', 'success');
                        } else {
                            toastRef.current?.show('Failed to delete', 'error');
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false, // Requirement 4: No need to crop
            quality: 1,
            allowsMultipleSelection: true, // Requirement 6: Batch import
            selectionLimit: 10, // Requirement 6: Max 10
        });

        if (!result.canceled) {
            const assets = result.assets;
            const total = assets.length;

            if (total === 1) {
                toastRef.current?.show('Processing image...', 'loading');
                const ingestResult = await handleIngest(assets[0].uri);
                if (ingestResult?.success) {
                    toastRef.current?.show('Image added successfully!', 'success');
                } else {
                    toastRef.current?.show('Failed to add image', 'error');
                }
            } else {
                toastRef.current?.show(`Starting batch processing of ${total} images`, 'info');

                let successCount = 0;
                for (let i = 0; i < total; i++) {
                    toastRef.current?.show(`Processing image ${i + 1}/${total}...`, 'loading');
                    try {
                        const ingestResult = await handleIngest(assets[i].uri);
                        if (ingestResult?.success) {
                            successCount++;
                        }
                    } catch (error) {
                        console.error(`Error processing image ${i + 1}`, error);
                    }
                }

                if (successCount === total) {
                    toastRef.current?.show(`Successfully added all ${total} images!`, 'success');
                } else {
                    toastRef.current?.show(`Batch complete: ${successCount}/${total} images added.`, 'info');
                }
            }
        }
    };

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setIsViewerVisible(true);
    };

    const viewerImages = displayImages.map(img => ({ uri: img.uri }));

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <StatusBar style="dark" />
                <SimpleToast ref={toastRef} />

                <SearchBar
                    value={searchQuery}
                    onChangeText={updateSearchQuery}
                    onSubmit={performSearch}
                    onClear={clearSearch}
                    isLoading={isSearching}
                />

                <View style={styles.content}>
                    <GalleryGrid
                        images={displayImages}
                        isLoading={isSearching}
                        isRefreshing={isRefreshing}
                        onRefresh={refreshGallery}
                        numColumns={numColumns}
                        onColumnsChange={setNumColumns}
                        onImagePress={openViewer}
                        onImageDelete={confirmDelete}
                        onAddPress={pickImage}
                    />
                </View>

                <View style={styles.fabContainer}>
                    <TouchableOpacity
                        style={styles.galleryFab}
                        onPress={pickImage}
                    >
                        <Ionicons name="images" size={24} color="#007AFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.fabMain}
                        onPress={() => setIsCameraVisible(true)}
                    >
                        <Ionicons name="camera" size={30} color="#fff" />
                    </TouchableOpacity>
                </View>

                <CameraModal
                    isVisible={isCameraVisible}
                    onClose={() => setIsCameraVisible(false)}
                    onCapture={onCapture}
                />

                <ImageView
                    images={viewerImages}
                    imageIndex={viewerIndex}
                    visible={isViewerVisible}
                    onRequestClose={() => setIsViewerVisible(false)}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 30,
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        gap: 16,
    },
    fabMain: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    galleryFab: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 4,
    },
});

export default HomeScreen;
