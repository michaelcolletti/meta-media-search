/**
 * React hook for lazy loading WASM modules
 */

import { useState, useEffect, useCallback } from 'react';

export interface WasmModuleState<T> {
  module: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export function useWasmModule<T>(
  loader: () => Promise<T>,
  deps: any[] = []
): WasmModuleState<T> {
  const [module, setModule] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadModule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await loader();
      setModule(loaded);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load WASM module'));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    loadModule();
  }, [loadModule]);

  return {
    module,
    loading,
    error,
    reload: loadModule,
  };
}

export default useWasmModule;
