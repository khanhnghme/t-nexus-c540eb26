import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutosaveOptions {
  data: string;
  onSave: (data: string) => Promise<void>;
  onError?: (error: Error) => void;
  delay?: number;
  enabled?: boolean;
}

export function useAutosave({ data, onSave, onError, delay = 1500, enabled = true }: UseAutosaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  
  const lastSavedData = useRef(data);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(async (dataToSave: string) => {
    if (!isMountedRef.current) return;
    
    if (dataToSave === lastSavedData.current) {
      setHasUnsavedChanges(false);
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(dataToSave);
      if (isMountedRef.current) {
        lastSavedData.current = dataToSave;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Autosave error:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      if (isMountedRef.current) {
        setSaveError(err);
      }
      onError?.(err);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [onSave, onError]);

  useEffect(() => {
    if (!enabled) return;
    
    if (data !== lastSavedData.current) {
      setHasUnsavedChanges(true);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        save(data);
      }, delay);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    save(data);
  }, [data, save]);

  const resetSavedData = useCallback((newData: string) => {
    lastSavedData.current = newData;
    setHasUnsavedChanges(false);
  }, []);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveError,
    forceSave,
    resetSavedData
  };
}
