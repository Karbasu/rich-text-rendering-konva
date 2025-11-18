import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { RichText } from '../src/components';
import { applyStyleToRange } from '../src/rich-text';
import type { RichTextDocument } from '../src/rich-text/types';

/**
 * Character Index and Storage Demo
 * Shows how to work with character indices, selections, and document storage
 */

const CharacterIndexDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const richTextRef = useRef<RichText | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  const [text, setText] = useState('Hello World! Click and drag to select text.');
  const [documentData, setDocumentData] = useState<RichTextDocument | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<{
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);
  const [charIndexView, setCharIndexView] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 900,
      height: 400,
    });

    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;

    const richText = new RichText({
      x: 50,
      y: 50,
      width: 800,
      height: 300,
      text: text,
      style: { fontSize: 24, lineHeight: 1.5 },
    });

    richTextRef.current = richText;
    layer.add(richText);

    // Update document data when text changes
    const updateDocumentData = () => {
      const doc = richText.getDocument();
      setDocumentData(doc);
      setText(richText.getText());

      // Create character index visualization
      const currentText = richText.getText();
      const indexView = currentText.split('').map((char, i) => {
        if (char === '\n') return `[${i}:\\n]`;
        if (char === ' ') return `[${i}:_]`;
        return `[${i}:${char}]`;
      }).join(' ');
      setCharIndexView(indexView);
    };

    richText.on('textchange', updateDocumentData);
    richText.on('editend', updateDocumentData);

    // Initial update
    updateDocumentData();

    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  // Get current selection
  const handleGetSelection = () => {
    if (!richTextRef.current) return;

    const doc = richTextRef.current.getDocument();
    const text = richTextRef.current.getText();

    // In a real app, you'd get this from the actual selection
    // For demo, we'll show how to detect it
    alert('To get selection: User selects text while editing.\nThe selection info is available in the document model.');
  };

  // Apply style to specific range
  const handleApplyStyle = (start: number, end: number, style: any) => {
    if (!richTextRef.current) return;

    let doc = richTextRef.current.getDocument();
    doc = applyStyleToRange(doc, start, end, style);
    richTextRef.current.setDocument(doc);
    setDocumentData(doc);

    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
  };

  // Find text and apply style
  const handleFindAndStyle = () => {
    const searchTerm = prompt('Enter text to find and style:', 'Hello');
    if (!searchTerm || !richTextRef.current) return;

    const text = richTextRef.current.getText();
    const index = text.indexOf(searchTerm);

    if (index === -1) {
      alert(`"${searchTerm}" not found!`);
      return;
    }

    // Found it! Apply style
    handleApplyStyle(index, index + searchTerm.length, {
      backgroundColor: '#FFFF00',
      fontWeight: 'bold',
    });

    alert(`Found "${searchTerm}" at index ${index}-${index + searchTerm.length}\nApplied highlight!`);
  };

  // Save document
  const handleSave = () => {
    if (!documentData) return;

    const saved = {
      document: documentData,
      timestamp: new Date().toISOString(),
      text: text,
    };

    localStorage.setItem('richTextDemo', JSON.stringify(saved));
    alert('Document saved to localStorage!');
  };

  // Load document
  const handleLoad = () => {
    const saved = localStorage.getItem('richTextDemo');
    if (!saved) {
      alert('No saved document found!');
      return;
    }

    const data = JSON.parse(saved);
    if (richTextRef.current) {
      richTextRef.current.setDocument(data.document);
      setDocumentData(data.document);
      setText(data.text);

      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
    }

    alert(`Loaded document from ${new Date(data.timestamp).toLocaleString()}`);
  };

  // Apply style to word at index
  const handleStyleWordAt = () => {
    const indexStr = prompt('Enter character index to find word:', '0');
    if (!indexStr || !richTextRef.current) return;

    const index = parseInt(indexStr);
    const text = richTextRef.current.getText();

    if (index < 0 || index >= text.length) {
      alert('Index out of range!');
      return;
    }

    // Find word boundaries
    let start = index;
    let end = index;

    // Go backwards to find word start
    while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\n') {
      start--;
    }

    // Go forwards to find word end
    while (end < text.length && text[end] !== ' ' && text[end] !== '\n') {
      end++;
    }

    const word = text.substring(start, end);

    handleApplyStyle(start, end, {
      color: '#FF0000',
      fontWeight: 'bold',
    });

    alert(`Word at index ${index}: "${word}"\nRange: ${start}-${end}\nApplied red + bold!`);
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <h1 style={{ marginBottom: '10px' }}>Character Index & Storage Demo</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Learn how to work with character indices, apply styles programmatically, and save/load documents
      </p>

      {/* Main Editor */}
      <div style={{
        border: '2px solid #667eea',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9',
      }}>
        <h3 style={{ marginBottom: '10px' }}>Rich Text Editor</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          Click to edit. Selection and styling happen at the character level.
        </p>
        <div ref={containerRef} style={{ backgroundColor: 'white', borderRadius: '4px' }} />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <ActionButton onClick={handleFindAndStyle}>
          🔍 Find & Highlight Text
        </ActionButton>
        <ActionButton onClick={handleStyleWordAt}>
          📝 Style Word at Index
        </ActionButton>
        <ActionButton onClick={() => handleApplyStyle(0, 5, { color: '#FF0000', fontWeight: 'bold' })}>
          ✨ Style Characters 0-5
        </ActionButton>
        <ActionButton onClick={() => handleApplyStyle(6, 11, { backgroundColor: '#FFFF00' })}>
          💡 Highlight Characters 6-11
        </ActionButton>
        <ActionButton onClick={handleSave}>
          💾 Save Document
        </ActionButton>
        <ActionButton onClick={handleLoad}>
          📂 Load Document
        </ActionButton>
      </div>

      {/* Character Index Visualization */}
      <InfoPanel title="Character Indices" color="#4CAF50">
        <p style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
          Each character has an index (0-based). Spaces and newlines count too!
        </p>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {charIndexView || 'No text yet...'}
        </div>
        <div style={{ marginTop: '12px', fontSize: '14px' }}>
          <strong>Total characters:</strong> {text.length}
        </div>
      </InfoPanel>

      {/* How to Get Indices */}
      <InfoPanel title="How to Get Character Indices" color="#2196F3">
        <CodeExample title="1. Find Text by Search">
{`const text = richText.getText();
const searchTerm = 'Hello';
const index = text.indexOf(searchTerm);

// index = starting position
// index + searchTerm.length = ending position

richText.applyStyleToRange(
  doc,
  index,
  index + searchTerm.length,
  { color: '#FF0000' }
);`}
        </CodeExample>

        <CodeExample title="2. Find Word at Cursor/Index">
{`const index = 10; // character position
const text = richText.getText();

// Find word boundaries
let start = index;
let end = index;

while (start > 0 && text[start - 1] !== ' ') start--;
while (end < text.length && text[end] !== ' ') end++;

const word = text.substring(start, end);
// Apply style to this word
richText.applyStyleToRange(doc, start, end, style);`}
        </CodeExample>

        <CodeExample title="3. Get User Selection">
{`// When user selects text while editing:
richText.on('editend', () => {
  const doc = richText.getDocument();
  // Selection is stored in the document's internal state
  // You can get the selected text range
});

// Or programmatically:
richText.selectAll(); // Selects all text
richText.toggleBold(); // Applies to selection`}
        </CodeExample>

        <CodeExample title="4. Style by Line Number">
{`const text = richText.getText();
const lines = text.split('\\n');

// Find line 2 (0-indexed)
const lineIndex = 1;
let start = 0;

for (let i = 0; i < lineIndex; i++) {
  start += lines[i].length + 1; // +1 for \\n
}

const end = start + lines[lineIndex].length;

// Style the entire line
richText.applyStyleToRange(doc, start, end, style);`}
        </CodeExample>
      </InfoPanel>

      {/* Document Storage Format */}
      <InfoPanel title="Document Storage Format" color="#FF9800">
        <p style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
          The document is stored as a JSON structure with styled text spans:
        </p>
        {documentData && (
          <pre style={{
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: '15px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '300px',
          }}>
            {JSON.stringify(documentData, null, 2)}
          </pre>
        )}

        <div style={{ marginTop: '15px' }}>
          <h4 style={{ marginBottom: '8px' }}>Understanding the Structure:</h4>
          <ul style={{ fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li><strong>spans[]</strong> - Array of text segments with styles</li>
            <li><strong>id</strong> - Unique identifier for each span</li>
            <li><strong>text</strong> - The actual text content</li>
            <li><strong>style</strong> - Font, color, size, weight, etc.</li>
            <li><strong>align</strong> - Text alignment (left/center/right/justify)</li>
            <li><strong>listItems</strong> - List formatting information</li>
          </ul>
        </div>

        <CodeExample title="Saving to Database">
{`// Save to localStorage
const docData = richText.getDocument();
localStorage.setItem('myDoc', JSON.stringify(docData));

// Save to backend API
await fetch('/api/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    document: richText.getDocument(),
    plainText: richText.getText(),
    createdAt: new Date().toISOString()
  })
});`}
        </CodeExample>

        <CodeExample title="Loading from Storage">
{`// Load from localStorage
const saved = localStorage.getItem('myDoc');
if (saved) {
  const docData = JSON.parse(saved);
  richText.setDocument(docData);
}

// Load from backend API
const response = await fetch('/api/documents/123');
const data = await response.json();
richText.setDocument(data.document);`}
        </CodeExample>
      </InfoPanel>

      {/* Practical Examples */}
      <InfoPanel title="Practical Examples" color="#9C27B0">
        <CodeExample title="Example 1: Highlight All Links">
{`const text = richText.getText();
const urlRegex = /(https?:\\/\\/[^\\s]+)/g;
let match;
let doc = richText.getDocument();

while ((match = urlRegex.exec(text)) !== null) {
  const start = match.index;
  const end = start + match[0].length;

  doc = applyStyleToRange(doc, start, end, {
    color: '#0066cc',
    underline: true
  });
}

richText.setDocument(doc);`}
        </CodeExample>

        <CodeExample title="Example 2: Syntax Highlighting">
{`const code = richText.getText();
const keywords = ['const', 'let', 'var', 'function'];
let doc = richText.getDocument();

keywords.forEach(keyword => {
  let index = 0;
  while ((index = code.indexOf(keyword, index)) !== -1) {
    doc = applyStyleToRange(doc, index, index + keyword.length, {
      color: '#0000FF',
      fontWeight: 'bold'
    });
    index += keyword.length;
  }
});

richText.setDocument(doc);`}
        </CodeExample>

        <CodeExample title="Example 3: Spell Check Underlining">
{`const misspelledWords = ['teh', 'wrld'];
const text = richText.getText();
let doc = richText.getDocument();

misspelledWords.forEach(word => {
  let index = text.indexOf(word);
  while (index !== -1) {
    doc = applyStyleToRange(doc, index, index + word.length, {
      color: '#FF0000',
      underline: true
    });
    index = text.indexOf(word, index + 1);
  }
});

richText.setDocument(doc);`}
        </CodeExample>

        <CodeExample title="Example 4: Progressive Text Reveal">
{`// Animate text character by character
const text = richText.getText();
let currentIndex = 0;

const revealInterval = setInterval(() => {
  if (currentIndex >= text.length) {
    clearInterval(revealInterval);
    return;
  }

  let doc = richText.getDocument();
  doc = applyStyleToRange(doc, currentIndex, currentIndex + 1, {
    color: '#000000', // Make visible
    backgroundColor: '#FFFF00' // Highlight current
  });

  // Remove highlight from previous
  if (currentIndex > 0) {
    doc = applyStyleToRange(doc, currentIndex - 1, currentIndex, {
      backgroundColor: undefined
    });
  }

  richText.setDocument(doc);
  currentIndex++;
}, 100);`}
        </CodeExample>
      </InfoPanel>

      {/* Tips */}
      <InfoPanel title="💡 Pro Tips" color="#607D8B">
        <ul style={{ fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li><strong>Character indices are 0-based</strong> - First character is at index 0</li>
          <li><strong>Spaces and newlines count</strong> - They have indices too!</li>
          <li><strong>End index is exclusive</strong> - applyStyleToRange(doc, 0, 5) styles chars 0-4</li>
          <li><strong>Use getText() to search</strong> - Then apply styles to found indices</li>
          <li><strong>Clone before modifying</strong> - Document operations are immutable</li>
          <li><strong>Save both document and plain text</strong> - For search and display</li>
          <li><strong>Use regex for complex patterns</strong> - URLs, emails, hashtags, etc.</li>
          <li><strong>Batch style operations</strong> - Apply all styles then set document once</li>
        </ul>
      </InfoPanel>
    </div>
  );
};

// Helper Components

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'transform 0.2s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
  >
    {children}
  </button>
);

const InfoPanel: React.FC<{
  title: string;
  color: string;
  children: React.ReactNode;
}> = ({ title, color, children }) => (
  <div style={{
    border: `2px solid ${color}`,
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  }}>
    <h3 style={{ marginBottom: '15px', color }}>{title}</h3>
    {children}
  </div>
);

const CodeExample: React.FC<{ title: string; children: string }> = ({ title, children }) => (
  <div style={{ marginBottom: '15px' }}>
    <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>{title}</h4>
    <pre style={{
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      padding: '12px',
      borderRadius: '4px',
      overflow: 'auto',
      fontSize: '12px',
      fontFamily: 'monospace',
    }}>
      {children}
    </pre>
  </div>
);

export default CharacterIndexDemo;
