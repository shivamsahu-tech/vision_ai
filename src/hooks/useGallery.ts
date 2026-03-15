import { useState, useEffect, useCallback } from 'react';
import { GalleryImage } from '../types/gallery';
import { SearchFunction } from '../services/SearchService';
import { IngestionFunction, getAllImages, deleteImageFromDb } from '../services/IngestionService';


export const useGallery = () => {
    const [allImages, setAllImages] = useState<GalleryImage[]>([]);
    const [displayImages, setDisplayImages] = useState<GalleryImage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isIngesting, setIsIngesting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadImages = useCallback(async () => {
        const rows = await getAllImages();
        const images: GalleryImage[] = rows.map((row: any) => ({
            id: row.id.toString(),
            uri: row.uri,
            createdAt: Date.now() // Mocking date for UI type safety, but not stored/used for sorting
        }));
        setAllImages(images);
        setDisplayImages(images);
    }, []);

    // Initial load 
    useEffect(() => {
        loadImages();
    }, [loadImages]);

    const refreshGallery = useCallback(async () => {
        setIsRefreshing(true);
        await loadImages();
        setIsRefreshing(false);
    }, [loadImages]);

    const updateSearchQuery = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    const performSearch = useCallback(async () => {
        // If query is cleared, instantly revert to full gallery
        if (!searchQuery.trim()) {
            setDisplayImages(allImages);
            return;
        }

        setIsSearching(true);
        try {
            // Call the strictly typed SearchFunction
            const response = await SearchFunction(searchQuery);

            if (response.success && response.results) {
                // Map the DB search results back into your UI's GalleryImage type
                const searchResults: GalleryImage[] = response.results.map((res, index) => ({
                    id: `search-${index}`, // Fallback ID since search only returned URI and distance
                    uri: res.uri,
                    createdAt: Date.now() // Mocking date for UI type safety
                }));
                setDisplayImages(searchResults);
            } else {
                setDisplayImages([]);
            }
        } catch (error) {
            console.error("Search failed:", error);
            setDisplayImages(allImages);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, allImages]);

    const handleIngest = useCallback(async (uri: string) => {
        setIsIngesting(true);
        try {
            // Call the strictly typed IngestionFunction
            const response = await IngestionFunction(uri);

            if (response.success && response.insertedId !== undefined) {
                // Construct the UI object using the new database ID
                const newImage: GalleryImage = {
                    id: response.insertedId.toString(),
                    uri: uri,
                    createdAt: Date.now()
                };

                setAllImages(prev => [newImage, ...prev]);

                if (!searchQuery) {
                    setDisplayImages(prev => [newImage, ...prev]);
                }
                return { success: true, id: response.insertedId };
            } else {
                console.error("Ingestion returned false or missing ID:", response.error);
                return { success: false, error: response.error };
            }
        } catch (error: any) {
            console.error("Ingestion failed:", error);
            return { success: false, error: error.message };
        } finally {
            setIsIngesting(false);
        }
    }, [searchQuery]);

    const handleDelete = useCallback(async (id: string) => {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) return { success: false, error: 'Invalid ID' };

        const success = await deleteImageFromDb(numericId);
        if (success) {
            setAllImages(prev => prev.filter(img => img.id !== id));
            setDisplayImages(prev => prev.filter(img => img.id !== id));
            return { success: true };
        }
        return { success: false, error: 'Database deletion failed' };
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setDisplayImages(allImages);
    }, [allImages]);

    return {
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
    };
};