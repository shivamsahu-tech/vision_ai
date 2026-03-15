import { useState, useEffect, useCallback } from 'react';
import { GalleryImage } from '../types/gallery';
import { SortType } from '../components/SortOptions';
import { SearchFunction } from '../services/SearchService';
import { IngestionFunction } from '../services/IngestionService';


export const useGallery = () => {
    const [allImages, setAllImages] = useState<GalleryImage[]>([]);
    const [displayImages, setDisplayImages] = useState<GalleryImage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isIngesting, setIsIngesting] = useState(false);
    const [sortType, setSortType] = useState<SortType>('Newest');

    // Initial load 
    // Note: Eventually, you should replace this mock data with a SQLite query 
    // like `SELECT id, uri FROM images` to load the real local gallery on boot.
    useEffect(() => {
        const mockImages: GalleryImage[] = [
            { id: '1', uri: 'https://picsum.photos/id/10/400/400', createdAt: Date.now() - 1000000 },
            { id: '2', uri: 'https://picsum.photos/id/20/400/400', createdAt: Date.now() - 500000 },
            { id: '3', uri: 'https://picsum.photos/id/30/400/400', createdAt: Date.now() - 2000000 },
        ];
        setAllImages(mockImages);
        setDisplayImages(mockImages);
    }, []);

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
                    createdAt: Date.now() // Mocking date for UI sorting purposes
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
            } else {
                console.error("Ingestion returned false or missing ID:", response.error);
            }
        } catch (error) {
            console.error("Ingestion failed:", error);
        } finally {
            setIsIngesting(false);
        }
    }, [searchQuery]);

    const handleSort = useCallback((type: SortType) => {
        setSortType(type);
        setDisplayImages(prev => {
            const sorted = [...prev];
            if (type === 'Newest') {
                return sorted.sort((a, b) => b.createdAt - a.createdAt);
            } else if (type === 'Oldest') {
                return sorted.sort((a, b) => a.createdAt - b.createdAt);
            } else if (type === 'A-Z') {
                return sorted.sort((a, b) => a.id.localeCompare(b.id));
            }
            return sorted;
        });
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
        sortType,
        updateSearchQuery,
        performSearch,
        handleIngest,
        handleSort,
        clearSearch
    };
};