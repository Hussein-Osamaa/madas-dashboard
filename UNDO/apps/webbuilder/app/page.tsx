import { EditorProvider } from '@/contexts/EditorContext'
import { EditorLayout } from '@/components/editor/EditorLayout'

export default function EditorPage() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  )
}
