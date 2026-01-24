/**
 * Backward-compatibility shim for auth.store.ts
 *
 * This file re-exports from the unified entra-auth.store.ts
 * All components importing useAuthStore will now use the unified Entra auth store.
 *
 * @deprecated Import directly from 'entra-auth.store' instead
 *
 * Migration path:
 * - Old: import { useAuthStore } from '@/store/auth.store';
 * - New: import { useEntraAuthStore } from '@/store/entra-auth.store';
 *
 * The useAuthStore export is an alias to useEntraAuthStore for compatibility.
 */

export { useAuthStore, useEntraAuthStore } from './entra-auth.store';

// Re-export types for components that might need them
export type { User, UpdateUserRequest } from '../types/shared';
