import { useState } from 'react';
import { Section } from '../../types/builder';
import PreviewModal from './PreviewModal';
import PublishModal from './PublishModal';
import { exportWebsiteToHTML } from '../../utils/exportWebsite';
import type { AutosaveStatus } from '../../hooks/useAutosave';

type Props = {
  siteId: string;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  onPreviewModeChange: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  onSave: () => void;
  saving: boolean;
  autosaveStatus?: AutosaveStatus;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
  showTheme?: boolean;
  onToggleTheme?: () => void;
  showPages?: boolean;
  onTogglePages?: () => void;
  showSEO?: boolean;
  onToggleSEO?: () => void;
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
  onToggleDrawer?: () => void;
};

const BuilderToolbar = ({
  siteId,
  previewMode,
  onPreviewModeChange,
  onSave,
  saving,
  autosaveStatus = 'idle',
  onBack,
  onSettings,
  sections,
  onPublish,
  siteName,
  currentStatus,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onToggleDrawer,
}: Props) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  return (
    <>
      <div className="h-12 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-3 gap-2 z-10 flex-shrink-0">
        {/* Hamburger — mobile only */}
        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className="md:hidden w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#ccc] rounded"
            title="Toggle panel"
          >
            <span className="material-icons text-base">menu</span>
          </button>
        )}

        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[#888] hover:text-[#ccc] transition-colors flex-shrink-0"
        >
          <span className="material-icons text-sm">arrow_back</span>
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="h-4 w-px bg-[#333] flex-shrink-0" />

        {/* Site name with live dot */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {currentStatus === 'published' && (
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-[#e8e8e8] max-w-[120px] truncate">{siteName}</span>
        </div>

        {/* TODO: multi-page support — wire to real page selector */}
        <select
          disabled
          className="bg-[#252525] text-[#555] text-xs rounded-md px-2 py-1 border border-[#333] focus:outline-none cursor-not-allowed flex-shrink-0"
        >
          <option value="home">Home page</option>
        </select>

        {/* Autosave status */}
        {autosaveStatus && autosaveStatus !== 'idle' && (
          <span className={`flex items-center gap-1 text-[10px] font-medium flex-shrink-0 ${
            autosaveStatus === 'saving'  ? 'text-blue-400' :
            autosaveStatus === 'pending' ? 'text-[#666]' :
            autosaveStatus === 'saved'   ? 'text-green-500' :
            autosaveStatus === 'error'   ? 'text-red-400'  : 'text-[#666]'
          }`}>
            {autosaveStatus === 'saving'  && <span className="material-icons text-xs animate-spin">progress_activity</span>}
            {autosaveStatus === 'saved'   && <span className="material-icons text-xs">check_circle</span>}
            {autosaveStatus === 'error'   && <span className="material-icons text-xs">warning</span>}
            {autosaveStatus === 'saving'  && 'Saving…'}
            {autosaveStatus === 'pending' && '●'}
            {autosaveStatus === 'saved'   && 'Saved'}
            {autosaveStatus === 'error'   && 'Failed'}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview mode */}
        <div className="flex items-center bg-[#252525] rounded-md overflow-hidden flex-shrink-0">
          {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPreviewModeChange(mode)}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${
                previewMode === mode
                  ? 'bg-[#333] text-[#e8e8e8]'
                  : 'text-[#666] hover:text-[#ccc]'
              }`}
            >
              <span className="material-icons text-sm">
                {mode === 'desktop' ? 'desktop_windows' : mode === 'tablet' ? 'tablet' : 'phone_android'}
              </span>
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#333] flex-shrink-0" />

        {/* Undo / Redo */}
        {onUndo && onRedo && (
          <>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#ccc] disabled:opacity-30 rounded transition-colors"
            >
              <span className="material-icons text-base">undo</span>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#ccc] disabled:opacity-30 rounded transition-colors"
            >
              <span className="material-icons text-base">redo</span>
            </button>
          </>
        )}

        {/* Export */}
        <button
          type="button"
          onClick={() => {
            const html = exportWebsiteToHTML(sections, siteName);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${siteName.replace(/\s+/g, '-')}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          title="Export as HTML"
          className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#ccc] rounded transition-colors"
        >
          <span className="material-icons text-sm">download</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onSettings}
          title="Settings"
          className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#ccc] rounded transition-colors"
        >
          <span className="material-icons text-sm">settings</span>
        </button>

        {/* Save */}
        <button
          id="save-btn"
          type="button"
          onClick={onSave}
          disabled={saving}
          title="Save"
          className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-[#ccc] disabled:opacity-30 rounded transition-colors"
        >
          <span className="material-icons text-sm">{saving ? 'progress_activity' : 'save'}</span>
        </button>

        {/* Preview */}
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1 border border-[#333] text-[#ccc] text-xs px-3 py-1.5 rounded-md hover:bg-[#252525] transition-colors flex-shrink-0"
        >
          <span className="material-icons text-sm">preview</span>
          Preview
        </button>

        {/* Publish */}
        <button
          type="button"
          onClick={() => setShowPublish(true)}
          className="flex items-center gap-1 bg-[#27491F] text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-[#1f3c19] transition-colors flex-shrink-0"
        >
          <span className="material-icons text-sm">publish</span>
          {currentStatus === 'published' ? 'Update' : 'Publish'}
        </button>
      </div>

      {/* PreviewModal */}
      <PreviewModal open={showPreview} onClose={() => setShowPreview(false)} sections={sections} siteId={siteId} />

      {/* PublishModal */}
      <PublishModal
        open={showPublish}
        onClose={() => setShowPublish(false)}
        onPublish={onPublish}
        siteId={siteId}
        siteName={siteName}
        currentStatus={currentStatus}
        sections={sections}
      />
    </>
  );
};

export default BuilderToolbar;
