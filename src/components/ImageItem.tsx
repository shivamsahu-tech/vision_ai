import React from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GalleryImage } from '../types/gallery';

interface ImageItemProps {
    image: GalleryImage;
    numColumns: number;
    onPress: () => void;
    onDelete: () => void;
}

const ImageItem: React.FC<ImageItemProps> = ({ image, numColumns, onPress, onDelete }) => {
    const windowWidth = Dimensions.get('window').width;
    const size = windowWidth / numColumns;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.imageWrapper}
                onPress={onPress}
            >
                <Image
                    source={{ uri: image.uri }}
                    style={styles.image}
                    contentFit="cover"
                    transition={200}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={onDelete}
                activeOpacity={0.7}
            >
                <Ionicons name="trash" size={14} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 1,
        position: 'relative',
    },
    imageWrapper: {
        flex: 1,
    },
    image: {
        flex: 1,
        backgroundColor: '#eee',
    },
    deleteButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
});

export default ImageItem;

