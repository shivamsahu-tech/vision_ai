import React from 'react';
import { FlatList, StyleSheet, View, Text, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import ImageItem from './ImageItem';
import { GalleryImage } from '../types/gallery';

interface GalleryGridProps {
    images: GalleryImage[];
    isLoading: boolean;
    isRefreshing?: boolean;
    onRefresh?: () => void;
    numColumns: number;
    onColumnsChange: (columns: number) => void;
    onImagePress: (index: number) => void;
    onImageDelete: (id: string) => void;
    onAddPress?: () => void;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({
    images,
    isLoading,
    isRefreshing = false,
    onRefresh,
    numColumns,
    onColumnsChange,
    onImagePress,
    onImageDelete,
    onAddPress
}) => {

    const onPinchGestureEvent = (event: any) => {
        // scale handle logic here if needed
    };

    const onPinchHandlerStateChange = (event: any) => {
        if (event.nativeEvent.state === State.END) {
            const scale = event.nativeEvent.scale;
            if (scale > 1.2 && numColumns > 2) {
                onColumnsChange(numColumns - 1);
            } else if (scale < 0.8 && numColumns < 5) {
                onColumnsChange(numColumns + 1);
            }
        }
    };

    if (isLoading && images.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Searching images...</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <PinchGestureHandler
                onGestureEvent={onPinchGestureEvent}
                onHandlerStateChange={onPinchHandlerStateChange}
            >
                <View style={styles.container}>
                    <FlatList
                        key={numColumns}
                        data={images}
                        keyExtractor={(item) => item.id}
                        numColumns={numColumns}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={onRefresh}
                                colors={['#007AFF']}
                                tintColor="#007AFF"
                            />
                        }
                        renderItem={({ item, index }) => (
                            <ImageItem
                                image={item}
                                numColumns={numColumns}
                                onPress={() => onImagePress(index)}
                                onDelete={() => onImageDelete(item.id)}
                            />
                        )}
                        contentContainerStyle={[
                            styles.listContent,
                            images.length === 0 && { flex: 1 }
                        ]}
                        ListEmptyComponent={
                            !isLoading ? (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconContainer}>
                                        <Ionicons name="images-outline" size={80} color="#ccc" />
                                    </View>
                                    <Text style={styles.emptyTitle}>Your Vault is Empty</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Start by adding some amazing images from your gallery or camera.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.addButton}
                                        onPress={onAddPress}
                                    >
                                        <Ionicons name="add" size={24} color="#fff" />
                                        <Text style={styles.addButtonText}>Add Images</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null
                        }
                    />
                </View>
            </PinchGestureHandler>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    listContent: {
        paddingBottom: 100,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 60,
    },
    emptyIconContainer: {
        marginBottom: 24,
        opacity: 0.6,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    addButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 8,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default GalleryGrid;

