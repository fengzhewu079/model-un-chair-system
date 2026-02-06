import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface SearchInputProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  clearOnSelect?: boolean; // Whether to clear input after selection
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  suggestions,
  onSelect,
  placeholder = 'Type to search...',
  label,
  value: controlledValue,
  onChange,
  clearOnSelect = false,
}, ref) => {
  const [internalInput, setInternalInput] = useState('');

  // Use controlled value if provided, otherwise use internal state
  const input = controlledValue !== undefined ? controlledValue : internalInput;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Expose the input ref to parent components
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const filteredSuggestions = input.length >= 2
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(input.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    setShowSuggestions(input.length >= 2 && filteredSuggestions.length > 0);
  }, [input, filteredSuggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    onSelect(value);
    // Clear or keep the selected value based on clearOnSelect prop
    if (controlledValue !== undefined && onChange) {
      onChange(clearOnSelect ? '' : value);
    } else {
      setInternalInput(clearOnSelect ? '' : value);
    }
    setShowSuggestions(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  const handleInputChange = (newValue: string) => {
    if (controlledValue !== undefined && onChange) {
      onChange(newValue);
    } else {
      setInternalInput(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        if (showSuggestions && filteredSuggestions.length > 0) {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        if (showSuggestions && filteredSuggestions.length > 0) {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;
      case 'Enter':
        e.preventDefault();
        // Always handle Enter key, even if suggestions are not showing
        if (showSuggestions && filteredSuggestions[highlightedIndex]) {
          handleSelect(filteredSuggestions[highlightedIndex]);
        } else if (input.trim()) {
          handleSelect(input.trim());
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-lg font-bold text-gray-900 mb-2">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-12 px-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-150"
      />

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className={`px-3 py-2 cursor-pointer text-base ${
                index === highlightedIndex
                  ? 'bg-blue-100 text-blue-900'
                  : 'hover:bg-gray-50'
              }`}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {input.length >= 2 && filteredSuggestions.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-3 py-2 text-sm text-gray-500">
            No matches found. Press Enter to add anyway.
          </div>
        </div>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
