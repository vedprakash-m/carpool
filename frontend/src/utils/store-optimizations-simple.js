"use strict";
/**
 * Simplified State Management Optimizations
 * Basic Zustand store patterns and utilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSimpleTripStore = exports.storeCache = void 0;
exports.createOptimizedStore = createOptimizedStore;
exports.withTransition = withTransition;
exports.useDebounced = useDebounced;
exports.useOptimizedSelector = useOptimizedSelector;
const react_1 = __importDefault(require("react"));
const zustand_1 = require("zustand");
/**
 * Simple cache implementation
 */
class SimpleCache {
    cache = new Map();
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttl = 300000) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }
    invalidate(keyPattern) {
        const keys = Array.from(this.cache.keys());
        for (const key of keys) {
            if (key.includes(keyPattern)) {
                this.cache.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
    }
}
exports.storeCache = new SimpleCache();
/**
 * Simple store factory
 */
function createOptimizedStore(initialState) {
    return (0, zustand_1.create)(() => initialState);
}
/**
 * Performance transition utilities
 */
function withTransition(callback) {
    if (react_1.default.startTransition) {
        react_1.default.startTransition(() => {
            callback();
        });
    }
    else {
        callback();
    }
}
/**
 * Debounced updates hook
 */
function useDebounced(value, delay) {
    const [debouncedValue, setDebouncedValue] = react_1.default.useState(value);
    react_1.default.useEffect(() => {
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
 * Optimized state selector
 */
function useOptimizedSelector(store, selector) {
    return react_1.default.useMemo(() => selector(store), [store, selector]);
}
exports.useSimpleTripStore = (0, zustand_1.create)((set) => ({
    // State
    trips: [],
    loading: false,
    error: null,
    // Actions
    setTrips: (trips) => set({ trips }),
    addTrip: (trip) => set((state) => ({ trips: [trip, ...state.trips] })),
    updateTrip: (id, updates) => set((state) => ({
        trips: state.trips.map((trip) => trip.id === id ? { ...trip, ...updates } : trip)
    })),
    removeTrip: (id) => set((state) => ({
        trips: state.trips.filter((trip) => trip.id !== id)
    })),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error })
}));
