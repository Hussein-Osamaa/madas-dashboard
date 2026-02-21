import { useState, useEffect, useRef } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { doc, db, getDoc, setDoc, serverTimestamp } from '../../lib/firebase';
import FullScreenLoader from '../../components/common/FullScreenLoader';

type CodeEditorFile = {
  name: string;
  content: string;
  language: 'html' | 'css' | 'javascript';
};

const CodeEditorPage = () => {
  const { businessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('My Website');
  const [files, setFiles] = useState<CodeEditorFile[]>([
    { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My Website</title>\n    <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n    <h1>Welcome to My Website</h1>\n    <p>Start coding your website here!</p>\n    <script src="script.js"></script>\n</body>\n</html>', language: 'html' },
    { name: 'styles.css', content: 'body {\n    font-family: Arial, sans-serif;\n    max-width: 1200px;\n    margin: 0 auto;\n    padding: 20px;\n    background-color: #f5f5f5;\n}\n\nh1 {\n    color: #333;\n    text-align: center;\n}', language: 'css' },
    { name: 'script.js', content: '// Your JavaScript code here\nconsole.log("Website loaded!");', language: 'javascript' }
  ]);
  const [activeFile, setActiveFile] = useState(0);
  const [previewMode, setPreviewMode] = useState<'split' | 'code' | 'preview'>('split');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadSite = async () => {
      if (!businessId) return;
      
      try {
        // Try to load existing code editor site
        const codeSiteRef = doc(db, 'businesses', businessId, 'code_sites', 'default');
        const codeSiteSnap = await getDoc(codeSiteRef);
        
        if (codeSiteSnap.exists()) {
          const data = codeSiteSnap.data();
          setSiteId(codeSiteSnap.id);
          setSiteName(data.name || 'My Website');
          if (data.files && Array.isArray(data.files)) {
            setFiles(data.files);
          }
        } else {
          // Create default site
          const newSiteData = {
            name: 'My Website',
            files: files,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(codeSiteRef, newSiteData);
          setSiteId(codeSiteRef.id);
        }
      } catch (error) {
        console.error('Failed to load site:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadSite();
  }, [businessId]);

  const updatePreview = () => {
    if (!iframeRef.current) return;

    const htmlFile = files.find(f => f.name === 'index.html') || files[0];
    const cssFile = files.find(f => f.name === 'styles.css');
    const jsFile = files.find(f => f.name === 'script.js');

    let htmlContent = htmlFile.content;
    
    // Inject CSS if exists
    if (cssFile) {
      const cssInjection = `<style>${cssFile.content}</style>`;
      htmlContent = htmlContent.replace('</head>', `${cssInjection}</head>`);
    }

    // Inject JavaScript if exists
    if (jsFile) {
      const jsInjection = `<script>${jsFile.content}</script>`;
      htmlContent = htmlContent.replace('</body>', `${jsInjection}</body>`);
    }

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
    }
  };

  useEffect(() => {
    updatePreview();
  }, [files, previewMode]);

  const handleFileChange = (index: number, content: string) => {
    const newFiles = [...files];
    newFiles[index].content = content;
    setFiles(newFiles);
  };

  const handleSave = async () => {
    if (!businessId || !siteId) return;
    
    setSaving(true);
    try {
      const codeSiteRef = doc(db, 'businesses', businessId, 'code_sites', siteId);
      await setDoc(codeSiteRef, {
        name: siteName,
        files: files,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      alert('Saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addFile = () => {
    const fileName = prompt('Enter file name (e.g., component.html, custom.css, utils.js):');
    if (!fileName) return;

    let language: 'html' | 'css' | 'javascript' = 'html';
    if (fileName.endsWith('.css')) language = 'css';
    else if (fileName.endsWith('.js') || fileName.endsWith('.javascript')) language = 'javascript';

    const newFile: CodeEditorFile = {
      name: fileName,
      content: language === 'html' ? '<div></div>' : language === 'css' ? '/* Your CSS here */' : '// Your JavaScript here',
      language
    };

    setFiles([...files, newFile]);
    setActiveFile(files.length);
  };

  const deleteFile = (index: number) => {
    if (files.length <= 1) {
      alert('You must have at least one file.');
      return;
    }
    if (confirm(`Delete ${files[index].name}?`)) {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      if (activeFile >= newFiles.length) {
        setActiveFile(newFiles.length - 1);
      }
    }
  };

  if (loading) {
    return <FullScreenLoader message="Loading code editor..." />;
  }

  return (
    <div className="h-screen flex flex-col bg-base">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-primary">Code Editor</h1>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            placeholder="Site name"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setPreviewMode('code')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                previewMode === 'code' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
              }`}
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('split')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                previewMode === 'split' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
              }`}
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('preview')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                previewMode === 'preview' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
              }`}
            >
              Preview
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-icons text-base">{saving ? 'hourglass_empty' : 'save'}</span>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* File Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <button
              type="button"
              onClick={addFile}
              className="w-full px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[#1f3c19] transition-colors flex items-center gap-2"
            >
              <span className="material-icons text-base">add</span>
              Add File
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 flex items-center justify-between group ${
                  activeFile === index ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                }`}
                onClick={() => setActiveFile(index)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="material-icons text-base text-gray-500">
                    {file.language === 'html' ? 'code' : file.language === 'css' ? 'style' : 'javascript'}
                  </span>
                  <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                </div>
                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  >
                    <span className="material-icons text-base text-red-600">close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Code Editor */}
          {(previewMode === 'code' || previewMode === 'split') && (
            <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200`}>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{files[activeFile]?.name}</span>
                <span className="text-xs text-gray-500">{files[activeFile]?.language.toUpperCase()}</span>
              </div>
              <textarea
                value={files[activeFile]?.content || ''}
                onChange={(e) => handleFileChange(activeFile, e.target.value)}
                className="flex-1 w-full p-4 font-mono text-sm resize-none border-0 focus:outline-none bg-white"
                style={{ tabSize: 2 }}
                spellCheck={false}
                placeholder="Start coding..."
              />
            </div>
          )}

          {/* Preview */}
          {(previewMode === 'preview' || previewMode === 'split') && (
            <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col bg-white`}>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Preview</span>
                <button
                  type="button"
                  onClick={updatePreview}
                  className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
                >
                  <span className="material-icons text-base">refresh</span>
                  Refresh
                </button>
              </div>
              <iframe
                ref={iframeRef}
                className="flex-1 w-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditorPage;

