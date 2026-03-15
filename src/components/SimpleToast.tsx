import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, Text, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
}

export interface SimpleToastHandle {
    show: (message: string, type?: ToastType, duration?: number) => void;
    hide: () => void;
}

const SimpleToast = forwardRef<SimpleToastHandle>((_, ref) => {
    const [state, setState] = useState<ToastState>({
        visible: false,
        message: '',
        type: 'info',
    });

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-20)).current;
    const hideTimeout = useRef<NodeJS.Timeout | null>(null);

    const hide = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -20,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setState(prev => ({ ...prev, visible: false }));
        });
    }, [fadeAnim, slideAnim]);

    const show = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
        if (hideTimeout.current) {
            clearTimeout(hideTimeout.current);
        }

        setState({ visible: true, message, type });

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        if (type !== 'loading' && duration > 0) {
            hideTimeout.current = setTimeout(() => {
                hide();
            }, duration);
        }
    }, [fadeAnim, slideAnim, hide]);

    useImperativeHandle(ref, () => ({
        show,
        hide,
    }));

    if (!state.visible) return null;

    const getIcon = () => {
        switch (state.type) {
            case 'success':
                return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
            case 'error':
                return <Ionicons name="alert-circle" size={20} color="#F44336" />;
            case 'loading':
                return <ActivityIndicator size="small" color="#007AFF" />;
            default:
                return <Ionicons name="information-circle" size={20} color="#007AFF" />;
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.content}>
                {getIcon()}
                <Text style={styles.message}>{state.message}</Text>
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    content: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        gap: 10,
        maxWidth: '100%',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    message: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
});

export default SimpleToast;
