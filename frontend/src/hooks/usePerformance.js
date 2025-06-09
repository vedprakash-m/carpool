"use strict";
/**
 * Frontend Performance Optimization Hooks
 * Custom hooks for performance monitoring and optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePerformanceMonitor = usePerformanceMonitor;
exports.useDebounce = useDebounce;
exports.useThrottle = useThrottle;
exports.useLazyLoad = useLazyLoad;
exports.useCachedState = useCachedState;
exports.useVirtualScroll = useVirtualScroll;
exports.useAsyncOperation = useAsyncOperation;
const react_1 = require("react");
/**
 * Hook for performance monitoring
 */
function usePerformanceMonitor() {
    const [metrics, setMetrics] = (0, react_1.useState)({
        renderTime: 0,
        loadTime: 0,
        interactionTime: 0
    });
    const startTime = (0, react_1.useRef)(0);
    const startTimer = (0, react_1.useCallback)(() => {
        startTime.current = performance.now();
    }, []);
    const endTimer = (0, react_1.useCallback)((type) => {
        const endTime = performance.now();
        const duration = endTime - startTime.current;
        setMetrics(prev => ({
            ...prev,
            [`${type}Time`]: duration
        }));
        // Log slow operations
        if (duration > 100) {
            console.warn(`Slow ${type} operation: ${duration.toFixed(2)}ms`);
        }
    }, []);
    return { metrics, startTimer, endTimer };
}
/**
 * Hook for debouncing values to improve performance
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
/**
 * Hook for throttling function calls
 */
function useThrottle(func, delay) {
    const lastCall = (0, react_1.useRef)(0);
    const timeoutRef = (0, react_1.useRef)();
    return (0, react_1.useCallback)(((...args) => {
        const now = Date.now();
        if (now - lastCall.current >= delay) {
            lastCall.current = now;
            return func(...args);
        }
        else {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                lastCall.current = Date.now();
                func(...args);
            }, delay - (now - lastCall.current));
        }
    }), [func, delay]);
}
/**
 * Hook for lazy loading with intersection observer
 */
function useLazyLoad(threshold = 0.1) {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const [hasLoaded, setHasLoaded] = (0, react_1.useState)(false);
    const elementRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const element = elementRef.current;
        if (!element || hasLoaded)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                setHasLoaded(true);
                observer.unobserve(element);
            }
        }, { threshold });
        observer.observe(element);
        return () => {
            observer.unobserve(element);
        };
    }, [threshold, hasLoaded]);
    return { elementRef, isVisible, hasLoaded };
}
/**
 * Hook for managing component state with local storage caching
 */
function useCachedState(key, initialValue, ttl = 5 * 60 * 1000 // 5 minutes default
) {
    const [state, setState] = (0, react_1.useState)(() => {
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const { value, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < ttl) {
                    return value;
                }
            }
        }
        catch (error) {
            console.warn('Failed to load cached state:', error);
        }
        return initialValue;
    });
    const setCachedState = (0, react_1.useCallback)((value) => {
        setState(value);
        try {
            localStorage.setItem(key, JSON.stringify({
                value,
                timestamp: Date.now()
            }));
        }
        catch (error) {
            console.warn('Failed to cache state:', error);
        }
    }, [key]);
    return [state, setCachedState];
}
/**
 * Hook for virtual scrolling performance optimization
 */
function useVirtualScroll(items, itemHeight, containerHeight) {
    const [scrollTop, setScrollTop] = (0, react_1.useState)(0);
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / itemHeight) + 1, items.length);
    const visibleItems = items.slice(visibleStart, visibleEnd);
    const totalHeight = items.length * itemHeight;
    const offsetY = visibleStart * itemHeight;
    const handleScroll = useThrottle((e) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, 16); // 60fps
    return {
        visibleItems,
        totalHeight,
        offsetY,
        handleScroll,
        visibleStart,
        visibleEnd
    };
}
/**
 * Hook for managing async operations with loading states
 */
function useAsyncOperation() {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const execute = (0, react_1.useCallback)(async (operation) => {
        setLoading(true);
        setError(null);
        try {
            const result = await operation();
            setData(result);
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Operation failed';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const reset = (0, react_1.useCallback)(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);
    return { data, loading, error, execute, reset };
}
