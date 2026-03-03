'use client'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-madas-primary mx-auto mb-4"></div>
        <p className="text-madas-primary font-medium">Loading Dashboard...</p>
      </div>
    </div>
  )
}
