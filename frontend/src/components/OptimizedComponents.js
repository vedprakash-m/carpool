"use strict";
/**
 * Frontend Component Optimization Utilities
 * Higher-order components and utilities for performance optimization
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedImage = void 0;
exports.createLazyComponent = createLazyComponent;
exports.withPerformanceMonitoring = withPerformanceMonitoring;
exports.createMemoizedComponent = createMemoizedComponent;
exports.VirtualizedList = VirtualizedList;
exports.PerformanceErrorBoundary = PerformanceErrorBoundary;
exports.useBatchedUpdates = useBatchedUpdates;
exports.OptimizedForm = OptimizedForm;
const react_1 = __importStar(require("react"));
const react_error_boundary_1 = require("react-error-boundary");
/**
 * Performance-optimized lazy loading wrapper
 */
function createLazyComponent(importFunc, fallback) {
    const LazyComponent = (0, react_1.lazy)(importFunc);
    return (0, react_1.memo)((props) => (<react_1.Suspense fallback={fallback || (<div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>)}>
      <LazyComponent {...props}/>
    </react_1.Suspense>));
}
/**
 * Performance monitoring HOC
 */
function withPerformanceMonitoring(WrappedComponent, componentName) {
    const componentDisplayName = componentName || WrappedComponent.displayName || WrappedComponent.name;
    const PerformanceMonitoredComponent = (0, react_1.memo)((props) => {
        react_1.default.useEffect(() => {
            const startTime = performance.now();
            return () => {
                const endTime = performance.now();
                const renderTime = endTime - startTime;
                if (renderTime > 16) { // Frame budget is ~16ms
                    console.warn(`Slow render detected in ${componentDisplayName}: ${renderTime.toFixed(2)}ms`);
                }
            };
        });
        return <WrappedComponent {...props}/>;
    });
    PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${componentDisplayName})`;
    return PerformanceMonitoredComponent;
}
/**
 * Memoized component with custom comparison
 */
function createMemoizedComponent(Component, compare) {
    return (0, react_1.memo)(Component, compare);
}
function VirtualizedList({ items, itemHeight, containerHeight, renderItem, overscan = 5, className = '' }) {
    const [scrollTop, setScrollTop] = react_1.default.useState(0);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;
    const handleScroll = react_1.default.useCallback((e) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);
    return (<div className={`overflow-auto ${className}`} style={{ height: containerHeight }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (<div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>))}
        </div>
      </div>
    </div>);
}
exports.OptimizedImage = (0, react_1.memo)(({ src, alt, width, height, className = '', placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+', onLoad, onError }) => {
    const [isLoaded, setIsLoaded] = react_1.default.useState(false);
    const [hasError, setHasError] = react_1.default.useState(false);
    const imgRef = react_1.default.useRef(null);
    const handleLoad = react_1.default.useCallback(() => {
        setIsLoaded(true);
        onLoad?.();
    }, [onLoad]);
    const handleError = react_1.default.useCallback(() => {
        setHasError(true);
        onError?.();
    }, [onError]);
    react_1.default.useEffect(() => {
        const img = imgRef.current;
        if (!img)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                img.src = src;
                observer.unobserve(img);
            }
        }, { threshold: 0.1 });
        observer.observe(img);
        return () => {
            observer.unobserve(img);
        };
    }, [src]);
    if (hasError) {
        return (<div className={`bg-gray-200 flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>);
    }
    return (<img ref={imgRef} alt={alt} width={width} height={height} className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`} src={placeholder} onLoad={handleLoad} onError={handleError} loading="lazy"/>);
});
exports.OptimizedImage.displayName = 'OptimizedImage';
function PerformanceErrorBoundary({ children, fallback: Fallback, onError }) {
    const DefaultFallback = ({ error, resetErrorBoundary }) => (<div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <h2 className="text-red-800 font-semibold mb-2">Something went wrong</h2>
      <p className="text-red-600 text-sm mb-4">{error.message}</p>
      <button onClick={resetErrorBoundary} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
        Try again
      </button>
    </div>);
    return (<react_error_boundary_1.ErrorBoundary FallbackComponent={Fallback || DefaultFallback} onError={onError} onReset={() => {
            // Clear any performance-related state
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        }}>
      {children}
    </react_error_boundary_1.ErrorBoundary>);
}
/**
 * Batch state updates for performance
 */
function useBatchedUpdates() {
    const [updates, setUpdates] = react_1.default.useState([]);
    const batchUpdate = react_1.default.useCallback((updateFn) => {
        setUpdates(prev => [...prev, updateFn]);
    }, []);
    react_1.default.useEffect(() => {
        if (updates.length > 0) {
            const timeoutId = setTimeout(() => {
                // Use setTimeout to batch updates in the next tick
                updates.forEach(update => update());
                setUpdates([]);
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [updates]);
    return batchUpdate;
}
function OptimizedForm({ children, onSubmit, validation, debounceMs = 300 }) {
    const [values, setValues] = react_1.default.useState({});
    const [errors, setErrors] = react_1.default.useState({});
    const validationTimeoutRef = react_1.default.useRef();
    const handleValueChange = react_1.default.useCallback((name, value) => {
        setValues(prev => ({ ...prev, [name]: value }));
        if (validation) {
            clearTimeout(validationTimeoutRef.current);
            validationTimeoutRef.current = setTimeout(() => {
                const newErrors = validation({ ...values, [name]: value });
                setErrors(newErrors);
            }, debounceMs);
        }
    }, [values, validation, debounceMs]);
    const handleSubmit = react_1.default.useCallback((e) => {
        e.preventDefault();
        if (validation) {
            const validationErrors = validation(values);
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }
        }
        onSubmit(values);
    }, [values, validation, onSubmit]);
    return (<form onSubmit={handleSubmit}>
      {react_1.default.Children.map(children, child => {
            if (react_1.default.isValidElement(child) && child.props.name) {
                return react_1.default.cloneElement(child, {
                    value: values[child.props.name] || '',
                    onChange: (e) => handleValueChange(child.props.name, e.target.value),
                    error: errors[child.props.name]
                });
            }
            return child;
        })}
    </form>);
}
