// src/components/builder/hooks/useBuilderNav.ts
import { useState, useCallback } from 'react';

export type NavView = 'outline' | 'section' | 'block';

export interface NavFrame {
  view: NavView;
  label: string;
  sectionId?: string;
  blockKey?: string;
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

  const pushBlock = useCallback((blockKey: string, label: string) => {
    setStack((prev) => {
      const base = prev.slice(0, 2);
      return [...base, { view: 'block', label, blockKey }];
    });
  }, []);

  const goTo = useCallback((index: number) => {
    setStack((prev) => prev.slice(0, index + 1));
  }, []);

  const reset = useCallback(() => {
    setStack([{ view: 'outline', label: 'Page outline' }]);
  }, []);

  return { stack, current, pushSection, pushBlock, goTo, reset };
}
