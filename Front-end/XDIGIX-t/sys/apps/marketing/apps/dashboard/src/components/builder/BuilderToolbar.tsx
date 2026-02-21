import { useState } from 'react';
import { Section } from '../../types/builder';
import PreviewModal from './PreviewModal';
import PublishModal from './PublishModal';
import { exportWebsiteToHTML } from '../../utils/exportWebsite';
import { useDarkMode } from '../../contexts/DarkModeContext';

type Props = {
  siteId: string;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  onPreviewModeChange: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  onSave: () => void;
  saving: boolean;
  onToggleSidebar: () => void;
  showSidebar: boolean;
  onBack: () => void;
  onSettings: () => void;
  sections: Section[];
  onPublish: (options: { status: 'draft' | 'published'; customDomain?: string }) => Promise<void>;
  siteName: string;
  currentStatus: 'draft' | 'published';
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
};

const BuilderToolbar = ({
  siteId,
  previewMode,
  onPreviewModeChange,
  onSave,
  saving,
  onToggleSidebar,
  showSidebar,
  onBack,
  onSettings,
  sections,
  onPublish,
  siteName,
  currentStatus,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: Props) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-50">
      <div className="flex items-center gap-4">
          <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-madas-text/70 hover:text-primary transition-colors"
        >
          <span className="material-icons text-base text-gray-600">arrow_back</span>
          Back to Sites
        </button>
        <div className="h-6 w-px bg-gray-200" />
        <h1 className="text-lg font-semibold text-primary">Website Builder</h1>
        {siteId && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <span className="text-xs text-madas-text/60">Site ID: {siteId.slice(0, 8)}...</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <span className="material-icons text-base text-yellow-400">light_mode</span>
          ) : (
            <span className="material-icons text-base text-gray-600">dark_mode</span>
          )}
        </button>

        <div className="h-6 w-px bg-gray-200" />

        {/* Preview Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onPreviewModeChange('desktop')}
            className={`p-2 rounded transition-colors ${
              previewMode === 'desktop' ? 'bg-white text-primary shadow-sm' : 'text-madas-text/60 hover:text-primary'
            }`}
            title="Desktop"
          >
            <span className={`material-icons text-base ${previewMode === 'desktop' ? 'text-primary' : 'text-gray-600'}`}>desktop_windows</span>
          </button>
          <button
            type="button"
            onClick={() => onPreviewModeChange('tablet')}
            className={`p-2 rounded transition-colors ${
              previewMode === 'tablet' ? 'bg-white text-primary shadow-sm' : 'text-madas-text/60 hover:text-primary'
            }`}
            title="Tablet"
          >
            <span className={`material-icons text-base ${previewMode === 'tablet' ? 'text-primary' : 'text-gray-600'}`}>tablet</span>
          </button>
          <button
            type="button"
            onClick={() => onPreviewModeChange('mobile')}
            className={`p-2 rounded transition-colors ${
              previewMode === 'mobile' ? 'bg-white text-primary shadow-sm' : 'text-madas-text/60 hover:text-primary'
            }`}
            title="Mobile"
          >
            <span className={`material-icons text-base ${previewMode === 'mobile' ? 'text-primary' : 'text-gray-600'}`}>phone_android</span>
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {/* Undo/Redo */}
        {onUndo && onRedo && (
          <>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-madas-text/60 hover:text-primary"
              title="Undo (Ctrl+Z)"
            >
              <span className="material-icons text-base text-gray-600">undo</span>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-madas-text/60 hover:text-primary"
              title="Redo (Ctrl+Shift+Z)"
            >
              <span className="material-icons text-base text-gray-600">redo</span>
            </button>
            <div className="h-6 w-px bg-gray-200" />
          </>
        )}

        {/* Sidebar Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-2 rounded transition-colors ${
            showSidebar ? 'bg-base text-primary' : 'text-madas-text/60 hover:text-primary'
          }`}
          title={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          <span className={`material-icons text-base ${showSidebar ? 'text-primary' : 'text-gray-600'}`}>view_sidebar</span>
        </button>

        {/* Preview Button */}
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
        >
          <span className="material-icons text-base mr-1 align-middle text-gray-700">preview</span>
          Preview
        </button>

        {/* Publish Button */}
        <button
          type="button"
          onClick={() => setShowPublish(true)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            currentStatus === 'published'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-primary text-white hover:bg-[#1f3c19]'
          }`}
        >
          <span className="material-icons text-base mr-1 align-middle">publish</span>
          {currentStatus === 'published' ? 'Published' : 'Publish'}
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={() => {
            const html = exportWebsiteToHTML(sections, siteName);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${siteName.replace(/\s+/g, '-')}.html`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          title="Export as HTML"
        >
          <span className="material-icons text-base text-gray-700">download</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onSettings}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          title="Settings"
        >
          <span className="material-icons text-base text-gray-700">settings</span>
        </button>

        {/* Save Button */}
        <button
          id="save-btn"
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary text-white px-6 py-2 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-sm"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="material-icons animate-spin text-base">progress_activity</span>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="material-icons text-base">save</span>
              Save
            </span>
          )}
        </button>
      </div>

      {/* Preview Modal */}
      <PreviewModal open={showPreview} onClose={() => setShowPreview(false)} sections={sections} siteId={siteId} />

      {/* Publish Modal */}
      <PublishModal
        open={showPublish}
        onClose={() => setShowPublish(false)}
        onPublish={onPublish}
        siteId={siteId}
        siteName={siteName}
        currentStatus={currentStatus}
        sections={sections}
      />
    </div>
  );
};

export default BuilderToolbar;

