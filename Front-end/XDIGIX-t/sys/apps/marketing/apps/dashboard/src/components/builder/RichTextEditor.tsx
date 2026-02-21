import { useRef, useEffect, useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const RichTextEditor = ({ value, onChange, placeholder = 'Enter text...', className = '' }: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [textColor, setTextColor] = useState('#27491f');
  const [showHexEditor, setShowHexEditor] = useState(false);
  const [hexInput, setHexInput] = useState('#27491f');
  const [currentHeading, setCurrentHeading] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const savedSelectionRef = useRef<Range | null>(null);

  // Save current selection
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      savedSelectionRef.current = null;
    }
  };

  // Restore saved selection
  const restoreSelection = () => {
    if (savedSelectionRef.current && editorRef.current) {
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelectionRef.current);
          return true;
        }
      } catch (e) {
        // Selection might be invalid, ignore
      }
    }
    return false;
  };

  // Check for text selection
  const checkSelection = () => {
    const selection = window.getSelection();
    const hasTextSelected = selection && selection.rangeCount > 0 && !selection.isCollapsed;
    setHasSelection(hasTextSelected || false);
    
    if (hasTextSelected && selection) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
    
    // Also update heading detection
    if (hasTextSelected && selection) {
      const node = selection.anchorNode;
      if (node) {
        const element = node.nodeType === Node.TEXT_NODE 
          ? (node.parentElement) 
          : (node as HTMLElement);
        
        if (element) {
          const tagName = element.tagName?.toLowerCase();
          if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
            setCurrentHeading(tagName);
          } else {
            setCurrentHeading(null);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  useEffect(() => {
    // Update hex input when textColor changes
    setHexInput(textColor);
  }, [textColor]);

  useEffect(() => {
    // Check selection on mouseup and keyup
    const handleSelectionChange = () => {
      checkSelection();
    };

    const handleMouseUp = () => {
      // Save selection on mouseup in the editor
      setTimeout(() => {
        saveSelection();
        checkSelection();
      }, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    if (editorRef.current) {
      editorRef.current.addEventListener('mouseup', handleMouseUp);
      editorRef.current.addEventListener('keyup', handleSelectionChange);
      editorRef.current.addEventListener('keydown', () => {
        // Save selection before any key action
        setTimeout(saveSelection, 10);
      });
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (editorRef.current) {
        editorRef.current.removeEventListener('mouseup', handleMouseUp);
        editorRef.current.removeEventListener('keyup', handleSelectionChange);
        editorRef.current.removeEventListener('keydown', () => {});
      }
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
      checkSelection();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    if (!editorRef.current) return;
    
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');
    
    if (html) {
      // Strip out unwanted tags but preserve basic formatting
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Clean up the HTML - remove script tags and style attributes
      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_ELEMENT,
        null
      );
      
      const nodesToRemove: Node[] = [];
      let node;
      
      while ((node = walker.nextNode())) {
        const element = node as HTMLElement;
        // Remove script and style tags
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
          nodesToRemove.push(element);
        }
        // Preserve style attributes for colors
        if (element.removeAttribute) {
          element.removeAttribute('class');
        }
      }
      
      nodesToRemove.forEach(n => n.parentNode?.removeChild(n));
      
      // Insert the cleaned HTML
      const range = window.getSelection()?.getRangeAt(0);
      if (range) {
        range.deleteContents();
        const fragment = range.createContextualFragment(tempDiv.innerHTML);
        range.insertNode(fragment);
      }
    } else {
      document.execCommand('insertText', false, text);
    }
    
    handleInput();
  };

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const applyHeading = (level: string) => {
    if (!editorRef.current) return;
    
    // Ensure editor is focused
    editorRef.current.focus();
    
    const selection = window.getSelection();
    
    // If no selection, select the current paragraph or line
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      // Try to select the current block element
      const sel = window.getSelection();
      
      if (sel) {
        const range = document.createRange();
        let blockElement: Node | null = null;
        
        if (sel.rangeCount > 0) {
          const currentRange = sel.getRangeAt(0);
          blockElement = currentRange.commonAncestorContainer;
        } else {
          // No range, try to get from cursor position
          if (editorRef.current.firstChild) {
            blockElement = editorRef.current.firstChild;
          }
        }
        
        // Find the block-level element
        if (blockElement && blockElement.nodeType === Node.TEXT_NODE) {
          blockElement = blockElement.parentElement || blockElement;
        }
        
        // Walk up to find a block element
        while (blockElement && blockElement.nodeType === Node.ELEMENT_NODE) {
          const tagName = (blockElement as HTMLElement).tagName?.toLowerCase();
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'li'].includes(tagName)) {
            break;
          }
          if (blockElement === editorRef.current) {
            // If we reached the editor, select all content or create a paragraph
            if (editorRef.current.innerHTML.trim() === '') {
              // Empty editor, insert a paragraph
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              editorRef.current.appendChild(p);
              range.selectNodeContents(p);
            } else {
              // Select the entire content
              range.selectNodeContents(editorRef.current);
            }
            sel.removeAllRanges();
            sel.addRange(range);
            blockElement = null;
            break;
          }
          blockElement = (blockElement as HTMLElement).parentElement;
        }
        
        if (blockElement && blockElement !== editorRef.current && blockElement.parentNode) {
          range.selectNodeContents(blockElement);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
    
    // Apply the heading format
    const value = level === 'normal' ? '<div>' : `<${level}>`;
    
    try {
      if (document.execCommand('formatBlock', false, value)) {
        setCurrentHeading(level === 'normal' ? null : level);
        handleInput();
        
        // Update heading state after a brief delay
        setTimeout(() => {
          const newSelection = window.getSelection();
          if (newSelection && newSelection.rangeCount > 0) {
            const node = newSelection.anchorNode;
            if (node) {
              const element = node.nodeType === Node.TEXT_NODE 
                ? (node.parentElement) 
                : (node as HTMLElement);
              
              if (element) {
                const tagName = element.tagName?.toLowerCase();
                if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
                  setCurrentHeading(tagName);
                } else {
                  setCurrentHeading(null);
                }
              }
            }
          }
        }, 10);
      }
    } catch (e) {
      console.error('Failed to apply heading:', e);
    }
    
    editorRef.current.focus();
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexInput(hex);
    
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      setTextColor(hex);
      // Auto-apply if text is selected
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        applyTextColorWithColor(hex);
      }
      setShowHexEditor(false);
    }
  };

  const handleHexBlur = () => {
    // Validate on blur
    if (/^#[0-9A-F]{6}$/i.test(hexInput)) {
      setTextColor(hexInput);
      // Auto-apply if text is selected
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        applyTextColorWithColor(hexInput);
      }
    } else {
      setHexInput(textColor); // Reset to current color
    }
    setShowHexEditor(false);
    checkSelection();
  };

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleHexBlur();
    } else if (e.key === 'Escape') {
      setHexInput(textColor);
      setShowHexEditor(false);
    }
  };

  const applyTextColorWithColor = (color: string = textColor) => {
    if (!editorRef.current) {
      return;
    }
    
    // First try to restore saved selection
    let range: Range | null = null;
    let selection = window.getSelection();
    
    // Always try to restore saved selection first
    if (savedSelectionRef.current) {
      try {
        // Clone the saved range to avoid issues
        const savedRange = savedSelectionRef.current.cloneRange();
        
        // Verify the range is still valid
        if (editorRef.current.contains(savedRange.commonAncestorContainer)) {
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(savedRange);
            range = selection.getRangeAt(0);
          }
        }
      } catch (e) {
        // Saved selection is invalid, try current
      }
    }
    
    // If no saved selection worked, try current selection
    if ((!range || range.collapsed) && selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (!currentRange.collapsed && editorRef.current.contains(currentRange.commonAncestorContainer)) {
        range = currentRange;
      }
    }
    
    if (!range || range.collapsed) {
      return;
    }
    
    // Ensure the range is within the editor
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return;
    }
    
    // Use surroundContents for simpler wrapping
    try {
      // Create span with color
      const span = document.createElement('span');
      span.style.color = color;
      
      // Try surroundContents first (works for simple selections)
      try {
        range.surroundContents(span);
        handleInput();
        editorRef.current.focus();
        return;
      } catch (e) {
        // surroundContents failed, use extractContents approach
      }
      
      // Extract and wrap manually
      const contents = range.extractContents();
      
      // Remove empty text nodes
      const walker = document.createTreeWalker(
        contents,
        NodeFilter.SHOW_TEXT,
        null
      );
      const emptyNodes: Node[] = [];
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent || node.textContent.trim() === '') {
          emptyNodes.push(node);
        }
      }
      emptyNodes.forEach(n => {
        try {
          n.parentNode?.removeChild(n);
        } catch (e) {
          // Ignore
        }
      });
      
      if (contents.textContent && contents.textContent.trim()) {
        // Move all content into span
        while (contents.firstChild) {
          span.appendChild(contents.firstChild);
        }
        
        // Insert the span
        range.insertNode(span);
        
        // Collapse selection after the span
        try {
          const newRange = document.createRange();
          newRange.setStartAfter(span);
          newRange.collapse(true);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } catch (e) {
          // Ignore selection errors
        }
        
        handleInput();
        editorRef.current.focus();
      }
    } catch (err) {
      console.error('Failed to apply color:', err);
    }
  };


  const clearFormatting = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Remove all formatting by extracting text and replacing
      const text = selection.toString();
      if (text) {
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    handleInput();
  };

  const removeLink = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const anchor = selection.anchorNode;
      if (anchor) {
        const link = anchor.nodeType === Node.TEXT_NODE
          ? anchor.parentElement?.closest('a')
          : (anchor as HTMLElement).closest('a');
        
        if (link) {
          const parent = link.parentNode;
          if (parent) {
            while (link.firstChild) {
              parent.insertBefore(link.firstChild, link);
            }
            parent.removeChild(link);
          }
        }
      }
    }
    handleInput();
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      {/* Main Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Bold"
        >
          <span className="text-sm font-bold text-gray-700">B</span>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Italic"
        >
          <span className="text-sm italic text-gray-700">I</span>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Underline"
        >
          <span className="text-sm underline text-gray-700">U</span>
        </button>
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Strikethrough"
        >
          <span className="text-sm line-through text-gray-700">S</span>
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatCode')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Code"
        >
          <span className="text-xs font-mono text-gray-700">&lt;/&gt;</span>
        </button>
        <button
          type="button"
          onClick={clearFormatting}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Clear Formatting"
        >
          <span className="text-xs text-gray-700">Tₓ</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter link URL:');
            if (url) execCommand('createLink', url);
          }}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Link"
        >
          <span className="material-icons text-base text-gray-700">link</span>
        </button>
        <button
          type="button"
          onClick={removeLink}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Remove Link"
        >
          <span className="material-icons text-base text-gray-700">link_off</span>
        </button>
      </div>

      {/* Color and Heading Row */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        {/* Color Picker Section */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-gray-300 rounded px-2 py-1">
            <input
              id="color-input-hidden"
              type="color"
              value={textColor}
              onFocus={saveSelection}
              onMouseDown={saveSelection}
              onChange={(e) => {
                const newColor = e.target.value;
                setTextColor(newColor);
                setHexInput(newColor);
                
                // Apply color immediately if selection exists
                setTimeout(() => {
                  applyTextColorWithColor(newColor);
                }, 10);
              }}
              onInput={(e) => {
                // Also apply on input for better responsiveness
                const newColor = (e.target as HTMLInputElement).value;
                setTextColor(newColor);
                setHexInput(newColor);
                if (restoreSelection()) {
                  setTimeout(() => applyTextColorWithColor(newColor), 10);
                }
              }}
              className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer"
              title="Choose Color (applies to selected text)"
            />
            {showHexEditor ? (
              <input
                type="text"
                value={hexInput}
                onChange={handleHexChange}
                onBlur={handleHexBlur}
                onKeyDown={handleHexKeyDown}
                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="#27491f"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-700 font-mono">{textColor}</span>
                <button
                  type="button"
                  onClick={() => setShowHexEditor(true)}
                  className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                  title="Edit Color"
                >
                  <span className="material-icons text-xs text-gray-600">edit</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Heading Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyHeading('h1')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              currentHeading === 'h1' 
                ? 'bg-purple-200 text-purple-800' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => applyHeading('h2')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              currentHeading === 'h2' 
                ? 'bg-purple-200 text-purple-800' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => applyHeading('h3')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              currentHeading === 'h3' 
                ? 'bg-purple-200 text-purple-800' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => applyHeading('h4')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              currentHeading === 'h4' 
                ? 'bg-purple-200 text-purple-800' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
            title="Heading 4"
          >
            H4
          </button>
        </div>

      </div>

      {/* List and Alignment Row */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        {/* List Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Bullet List"
          >
            <span className="material-icons text-base text-gray-700">format_list_bulleted</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Numbered List"
          >
            <span className="material-icons text-base text-gray-700">format_list_numbered</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('indent')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Indent"
          >
            <span className="material-icons text-base text-gray-700">format_indent_increase</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('outdent')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Outdent"
          >
            <span className="material-icons text-base text-gray-700">format_indent_decrease</span>
          </button>
        </div>

        {/* Alignment Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Align Left"
          >
            <span className="material-icons text-base text-gray-700">format_align_left</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Align Center"
          >
            <span className="material-icons text-base text-gray-700">format_align_center</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Align Right"
          >
            <span className="material-icons text-base text-gray-700">format_align_right</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyFull')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Justify"
          >
            <span className="material-icons text-base text-gray-700">format_align_justify</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="p-3 text-sm focus:outline-none overflow-y-auto bg-gray-50"
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: className.includes('min-h') ? undefined : '150px'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable]:focus {
          outline: none;
        }
        [contenteditable] span[style*="color"] {
          display: inline !important;
        }
        [contenteditable] span[style*="color"] * {
          color: inherit !important;
        }
        [contenteditable] code {
          background-color: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
