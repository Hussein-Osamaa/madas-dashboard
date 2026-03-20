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
  onOpenAddSheet?: () => void;
  onToggleTheme?: () => void;
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
  onOpenAddSheet,
  onToggleTheme,
}: Props) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  return (
    <>
      <div className="h-12 bg-white border-b border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,.06)] flex items-center px-3 gap-2 z-10 flex-shrink-0">
        {/* Hamburger — mobile only */}
        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className="md:hidden w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] rounded"
            title="Toggle panel"
          >
            <span className="material-icons text-base">menu</span>
          </button>
        )}

        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#111827] transition-colors flex-shrink-0"
        >
          <span className="material-icons text-sm">arrow_back</span>
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="h-4 w-px bg-[#e5e7eb] flex-shrink-0" />

        {/* Site name with live dot */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {currentStatus === 'published' && (
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-[#111827] max-w-[120px] truncate">{siteName}</span>
        </div>

        {/* Center: page selector + device group */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {/* TODO: multi-page support — wire to real page selector */}
          <select
            disabled
            className="bg-[#f3f4f6] text-[#6b7280] text-xs rounded-md px-2 py-1 border border-[#e5e7eb] focus:outline-none cursor-not-allowed flex-shrink-0"
          >
            <option value="home">Home page</option>
          </select>

          {/* Preview mode */}
          <div className="flex items-center bg-[#f3f4f6] rounded-md overflow-hidden flex-shrink-0">
            {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onPreviewModeChange(mode)}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                  previewMode === mode
                    ? 'bg-white text-[#111827] shadow-sm'
                    : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                <span className="material-icons text-sm">
                  {mode === 'desktop' ? 'desktop_windows' : mode === 'tablet' ? 'tablet' : 'phone_android'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: autosave + undo/redo + add section + theme + export + settings + save + preview + publish */}
        <div className="flex items-center gap-1">
          {/* Autosave status */}
          {autosaveStatus && autosaveStatus !== 'idle' && (
            <span className={`flex items-center gap-1 text-[10px] font-medium flex-shrink-0 ${
              autosaveStatus === 'saving'  ? 'text-blue-400' :
              autosaveStatus === 'pending' ? 'text-[#6b7280]' :
              autosaveStatus === 'saved'   ? 'text-green-500' :
              autosaveStatus === 'error'   ? 'text-red-400'  : 'text-[#6b7280]'
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

          {/* Undo / Redo */}
          {onUndo && onRedo && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] disabled:opacity-30 rounded transition-colors"
              >
                <span className="material-icons text-base">undo</span>
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] disabled:opacity-30 rounded transition-colors"
              >
                <span className="material-icons text-base">redo</span>
              </button>
            </>
          )}

          {/* Add section */}
          <button
            type="button"
            onClick={onOpenAddSheet}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] rounded transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">add_circle_outline</span>
            Add section
          </button>

          {/* Theme */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] rounded transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">light_mode</span>
            Theme
          </button>

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
            className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] rounded transition-colors"
          >
            <span className="material-icons text-sm">download</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onSettings}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] rounded transition-colors"
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
            className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] disabled:opacity-30 rounded transition-colors"
          >
            <span className="material-icons text-sm">{saving ? 'progress_activity' : 'save'}</span>
          </button>

          {/* Preview */}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1 border border-[#e5e7eb] text-[#111827] text-xs px-3 py-1.5 rounded-md hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">preview</span>
            Preview
          </button>

          {/* Publish */}
          <button
            type="button"
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-1 bg-[#e8f5e9] text-[#27491F] text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-[#d1e7d3] transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">publish</span>
            {currentStatus === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
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
