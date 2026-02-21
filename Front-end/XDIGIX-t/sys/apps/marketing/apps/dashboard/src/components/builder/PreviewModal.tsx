import { Section } from '../../types/builder';
import SectionRenderer from './SectionRenderer';

type Props = {
  open: boolean;
  onClose: () => void;
  sections: Section[];
  siteId?: string;
};

const PreviewModal = ({ open, onClose, sections, siteId }: Props) => {
  if (!open) return null;

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-primary">Website Preview</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-base transition-colors"
          >
            <span className="material-icons text-base">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-6xl mx-auto bg-white min-h-full">
            {sortedSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="material-icons text-6xl text-madas-text/30 mb-4">web</span>
                <p className="text-lg font-medium text-madas-text/70 mb-2">No Sections Yet</p>
                <p className="text-sm text-madas-text/60">Add sections to see your website preview</p>
              </div>
            ) : (
              sortedSections.map((section) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  isSelected={false}
                  onSelect={() => {}}
                  siteId={siteId}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

