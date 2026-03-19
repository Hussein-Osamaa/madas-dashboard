// src/components/builder/hooks/useBuilderNav.ts
import { useState, useCallback } from 'react';

export type NavView = 'outline' | 'section' | 'block';

export interface NavFrame {
  view: NavView;
  label: string;
  sectionId?: string;
  blockKey?: string;   // block type key (e.g. 'feature')
  blockIndex?: number; // index within the blocks array
}

export function useBuilderNav() {
  const [stack, setStack] = useState<NavFrame[]>([
    { view: 'outline', label: 'Page outline' },
  ]);

  const current = stack[stack.length - 1];

  const pushSection = useCallback((sectionId: string, label: string) => {
    setStack([
      { view: 'outline', label: 'Page outline' },
      { view: 'section', label, sectionId },
    ]);
  }, []);

  const pushBlock = useCallback((blockKey: string, label: string, blockIndex: number) => {
    setStack((prev) => {
      const base = prev.slice(0, 2);
      if (base.length < 2) return prev; // called before pushSection — ignore
      return [...base, { view: 'block' as NavView, label, blockKey, blockIndex }];
    });
  }, []);

  const goTo = useCallback((index: number) => {
    setStack((prev) => {
      const safeIndex = Math.max(0, Math.min(index, prev.length - 1));
      return prev.slice(0, safeIndex + 1);
    });
  }, []);

  const reset = useCallback(() => {
    setStack([{ view: 'outline', label: 'Page outline' }]);
  }, []);

  return { stack, current, pushSection, pushBlock, goTo, reset };
}
