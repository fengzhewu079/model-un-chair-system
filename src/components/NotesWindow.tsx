import React, { useState, useRef, useEffect } from 'react';

interface NotesWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesWindow: React.FC<NotesWindowProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 700, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);

  // Load saved notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('mun-chair-notes');
    if (savedNotes) {
      setContent(savedNotes);
    }
    const savedPosition = localStorage.getItem('mun-chair-notes-position');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
    const savedSize = localStorage.getItem('mun-chair-notes-size');
    if (savedSize) {
      setSize(JSON.parse(savedSize));
    }
  }, []);

  // Load content into editor
  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content;
    }
  }, [isOpen]);

  const saveNotes = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      localStorage.setItem('mun-chair-notes', htmlContent);
      setContent(htmlContent);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Dragging handlers
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.title-bar') && !target.closest('button')) {
      e.preventDefault();
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        e.preventDefault();
        const newWidth = Math.max(500, Math.min(window.innerWidth - position.x, resizeStart.width + (e.clientX - resizeStart.x)));
        const newHeight = Math.max(400, Math.min(window.innerHeight - position.y, resizeStart.height + (e.clientY - resizeStart.y)));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        localStorage.setItem('mun-chair-notes-position', JSON.stringify(position));
      }
      if (isResizing) {
        localStorage.setItem('mun-chair-notes-size', JSON.stringify(size));
      }
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, position, size]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(e.target as Node)) {
        setShowHighlightPicker(false);
      }
    };

    if (showColorPicker || showHighlightPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker, showHighlightPicker]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm"
        style={{ zIndex: 99 }}
        onClick={() => {
          saveNotes();
          onClose();
        }}
      />

      {/* Window */}
      <div
        className="fixed bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          zIndex: 100,
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div
          className="title-bar bg-gradient-to-r from-gray-800 to-gray-700 px-5 py-3 flex items-center justify-between cursor-move select-none"
          onMouseDown={handleMouseDownDrag}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-white font-medium text-sm tracking-wide">Notes</span>
          </div>
          <button
            onClick={() => {
              saveNotes();
              onClose();
            }}
            className="text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-4 flex-wrap select-none">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => execCommand('bold')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 font-bold text-gray-700"
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 italic text-gray-700"
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => execCommand('underline')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 underline text-gray-700"
              title="Underline"
            >
              U
            </button>
          </div>

          {/* Font Size */}
          <select
            onChange={(e) => execCommand('fontSize', e.target.value)}
            className="h-8 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            defaultValue="3"
          >
            <option value="1">Small</option>
            <option value="3">Medium</option>
            <option value="5">Large</option>
            <option value="7">X-Large</option>
          </select>

          {/* Text Color Picker */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 bg-white border border-gray-200"
              title="Text Color"
            >
              <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h8v11H4V4zm10 0v11a2 2 0 01-2 2h8a2 2 0 002-2V4a2 2 0 00-2-2h-8a2 2 0 012 2z" clipRule="evenodd" />
                <circle cx="6" cy="6" r="1" fill="#EF4444" />
                <circle cx="10" cy="6" r="1" fill="#3B82F6" />
                <circle cx="8" cy="8" r="1" fill="#10B981" />
              </svg>
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50">
                <div className="text-xs text-gray-500 font-medium mb-2">Text Color</div>
                <div className="grid grid-cols-3 gap-2">
                  {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        execCommand('foreColor', color);
                        setShowColorPicker(false);
                      }}
                      className="w-8 h-8 rounded border-2 border-white shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Picker */}
          <div className="relative" ref={highlightPickerRef}>
            <button
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 bg-white border border-gray-200"
              title="Highlight"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                <rect x="4" y="12" width="16" height="6" fill="#FEF08A" opacity="0.5" />
              </svg>
            </button>

            {showHighlightPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50">
                <div className="text-xs text-gray-500 font-medium mb-2">Highlight</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { color: 'transparent', label: 'None' },
                    { color: '#FEF08A', label: 'Yellow' },
                    { color: '#BBF7D0', label: 'Green' },
                    { color: '#BFDBFE', label: 'Blue' },
                    { color: '#DDD6FE', label: 'Purple' },
                    { color: '#FECACA', label: 'Red' },
                  ].map((item) => (
                    <button
                      key={item.color}
                      onClick={() => {
                        execCommand('hiliteColor', item.color);
                        setShowHighlightPicker(false);
                      }}
                      className="w-8 h-8 rounded border-2 border-gray-300 shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: item.color }}
                      title={item.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => execCommand('insertUnorderedList')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
              title="Bullet list"
            >
              <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('insertOrderedList')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
              title="Numbered list"
            >
              <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          className="flex-1 p-6 overflow-y-auto focus:outline-none text-gray-800 leading-relaxed"
          style={{
            minHeight: '300px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onBlur={saveNotes}
          suppressContentEditableWarning
          placeholder="Start typing..."
        />

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-4 h-4">
            <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a1 1 0 100 2h1.586l-3.293 3.293a1 1 0 101.414 1.414L16 9.414V11a1 1 0 102 0V6h-5z" />
              <path d="M6 13a1 1 0 100 2h1.586l-3.293 3.293a1 1 0 101.414 1.414L9 16.414V18a1 1 0 102 0v-5H6z" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
