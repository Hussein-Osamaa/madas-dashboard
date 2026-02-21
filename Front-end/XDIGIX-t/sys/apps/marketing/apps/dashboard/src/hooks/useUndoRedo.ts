import { useState, useCallback, useRef, useEffect } from 'react';
import { Section } from '../types/builder';

const MAX_HISTORY = 50;

export function useUndoRedo(initialSections: Section[]) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [history, setHistory] = useState<Section[][]>([initialSections]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  const initialSectionsRef = useRef(initialSections);

  // Update when initial sections change (e.g., after loading from Firebase)
  useEffect(() => {
    const hasChanged = JSON.stringify(initialSections) !== JSON.stringify(initialSectionsRef.current);
    if (hasChanged && initialSections.length >= 0) {
      initialSectionsRef.current = initialSections;
      setSections(initialSections);
      setHistory([initialSections]);
      setHistoryIndex(0);
    }
  }, [initialSections]);

  const updateSections = useCallback((newSections: Section[]) => {
    setSections(newSections);

    if (!isUndoRedoRef.current) {
      // Add to history
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newSections);
        
        // Limit history size
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
          return newHistory;
        }
        
        return newHistory;
      });
      setHistoryIndex((prev) => {
        const newIndex = prev + 1;
        return newIndex >= MAX_HISTORY ? MAX_HISTORY - 1 : newIndex;
      });
    }
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSections(history[newIndex]);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
      return true;
    }
    return false;
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSections(history[newIndex]);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
      return true;
    }
    return false;
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    sections,
    updateSections,
    undo,
    redo,
    canUndo,
    canRedo
  };
}

