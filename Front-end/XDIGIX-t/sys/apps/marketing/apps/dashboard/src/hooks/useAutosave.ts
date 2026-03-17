import { useEffect, useRef, useCallback } from 'react';
import { Section } from '../types/builder';

/* ─────────────────────────────────────────────────────────────────────────
   useAutosave — debounced automatic save hook

   Watches `sections` for changes and fires a PATCH after `debounceMs` ms
   of inactivity.  A manual `triggerSave()` bypasses the debounce timer and
   saves immediately.

   States reported via `onStatusChange`:
     'idle'    — no unsaved changes
     'pending' — timer counting down
     'saving'  — request in-flight
     'saved'   — last save succeeded
     'error'   — last save failed

   Usage:
     const { triggerSave } = useAutosave(siteId, sections, {
       onStatusChange: setAutosaveStatus,
       onError: (e) => toast.error(e.message),
     });
───────────────────────────────────────────────────────────────────────── */

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions {
  /** Called whenever the autosave state changes */
  onStatusChange?: (status: AutosaveStatus) => void;
  /** Called when a save attempt fails */
  onError?: (err: Error) => void;
  /** Debounce delay in ms (default: 3000) */
  debounceMs?: number;
  /** REST API base — defaults to /api */
  apiBase?: string;
  /** Bearer token getter — must be stable (wrapped in useCallback by caller) */
  getToken?: () => string | null;
}

export function useAutosave(
  siteId: string | null,
  sections: Section[],
  options: UseAutosaveOptions = {}
) {
  const {
    onStatusChange,
    onError,
    debounceMs = 3000,
    apiBase = '/api',
    getToken,
  } = options;

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef  = useRef<Section[]>(sections);
  const isMountedRef = useRef(true);
  const isFirstRender = useRef(true);

  // Keep sectionsRef current without triggering effect re-runs
  useEffect(() => { sectionsRef.current = sections; }, [sections]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** Core save function — can be called directly (manual) or via timer */
  const save = useCallback(async () => {
    if (!siteId) return;

    onStatusChange?.('saving');

    try {
      const token = getToken?.() ?? null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/sites/${siteId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sections: sectionsRef.current }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(msg);
      }

      if (isMountedRef.current) {
        onStatusChange?.('saved');
        // Reset to idle after 3s so the "✓ Saved" badge fades away
        setTimeout(() => {
          if (isMountedRef.current) onStatusChange?.('idle');
        }, 3000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        onStatusChange?.('error');
        onError?.(err as Error);
      }
    }
  }, [siteId, apiBase, getToken, onStatusChange, onError]);

  /** Debounced autosave — fires whenever sections reference changes */
  useEffect(() => {
    // Skip the very first render (sections just loaded, nothing changed yet)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!siteId) return;

    onStatusChange?.('pending');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // sections is the reactive dep — its reference changes on every real edit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, sections, debounceMs]);

  /** Manual save — bypasses the debounce timer */
  const triggerSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void save();
  }, [save]);

  return { triggerSave };
}
