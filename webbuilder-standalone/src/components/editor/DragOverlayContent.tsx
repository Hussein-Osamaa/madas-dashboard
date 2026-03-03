'use client'

import { ComponentRenderer } from './ComponentRenderer'

interface DragOverlayContentProps {
  component: any
}

export function DragOverlayContent({ component }: DragOverlayContentProps) {
  return (
    <div className="opacity-50 transform rotate-3">
      <ComponentRenderer
        component={component.defaultProps}
        isSelected={false}
        onSelect={() => {}}
      />
    </div>
  )
}
