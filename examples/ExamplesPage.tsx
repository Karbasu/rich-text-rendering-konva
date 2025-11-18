import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { RichText } from '../src/components';
import { applyStyleToRange } from '../src/rich-text';

/**
 * Comprehensive Examples Page for RichText Component
 * Shows all features with interactive demos and code snippets
 */

const ExamplesPage: React.FC = () => {
  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{ marginBottom: '60px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          RichText Component Examples
        </h1>
        <p style={{ fontSize: '20px', color: '#666', maxWidth: '700px', margin: '0 auto' }}>
          A comprehensive guide to using the RichText component for Konva.js
        </p>
      </header>

      {/* Quick Start */}
      <Section title="Quick Start" id="quick-start">
        <Description>
          Get started with the RichText component in just a few lines of code.
        </Description>
        <DemoContainer>
          <QuickStartDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`import { RichText } from './components';

const richText = new RichText({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  text: 'Hello World!',
  style: { fontSize: 24, color: '#333' },
  draggable: true
});

layer.add(richText);`}</CodeBlock>
      </Section>

      {/* Basic Styling */}
      <Section title="Basic Styling" id="basic-styling">
        <Description>
          Apply styles to your text using the <code>style</code> parameter.
        </Description>
        <DemoContainer>
          <BasicStylingDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`const richText = new RichText({
  x: 100,
  y: 100,
  width: 400,
  height: 150,
  text: 'Styled Text',
  style: {
    fontSize: 32,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    color: '#FF6B6B',
    lineHeight: 1.5,
    letterSpacing: 2
  },
  draggable: true
});`}</CodeBlock>
      </Section>

      {/* Text Alignment */}
      <Section title="Text Alignment" id="alignment">
        <Description>
          Align text horizontally and vertically within the text box.
        </Description>
        <DemoContainer>
          <AlignmentDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`// Horizontal alignment
richText.setAlign('left');    // left, center, right, justify
richText.setAlign('center');
richText.setAlign('right');

// Vertical alignment
richText.setVerticalAlign('top');     // top, middle, bottom
richText.setVerticalAlign('middle');`}</CodeBlock>
      </Section>

      {/* Transformations */}
      <Section title="Transformations" id="transformations">
        <Description>
          Scale, rotate, and transform your text boxes just like any Konva shape.
        </Description>
        <DemoContainer>
          <TransformationsDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`// Set transformations on creation
const richText = new RichText({
  x: 200,
  y: 150,
  width: 300,
  height: 150,
  text: 'Transformed!',
  scaleX: 1.5,
  scaleY: 1.5,
  rotation: 45,
  draggable: true
});

// Or apply after creation
richText.scaleUniform(1.5);
richText.rotateDeg(45);
richText.x(200);
richText.y(150);`}</CodeBlock>
      </Section>

      {/* Character-Level Styling */}
      <Section title="Character-Level Styling" id="character-styling">
        <Description>
          Apply different styles to individual characters or character ranges.
        </Description>
        <DemoContainer>
          <CharacterStylingDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`import { applyStyleToRange } from './rich-text';

const richText = new RichText({
  x: 100, y: 100,
  width: 400, height: 150,
  text: 'Hello World',
  style: { fontSize: 32 }
});

let doc = richText.getDocument();

// Style "Hello" (characters 0-5)
doc = applyStyleToRange(doc, 0, 5, {
  color: '#FF0000',
  fontWeight: 'bold'
});

// Style "World" (characters 6-11)
doc = applyStyleToRange(doc, 6, 11, {
  color: '#0000FF',
  fontStyle: 'italic'
});

richText.setDocument(doc);`}</CodeBlock>
      </Section>

      {/* Lists */}
      <Section title="Lists" id="lists">
        <Description>
          Create bullet lists and numbered lists with automatic formatting and nesting.
        </Description>
        <DemoContainer>
          <ListsDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`// Toggle bullet list
richText.toggleBulletList();

// Toggle numbered list
richText.toggleNumberedList();

// Keyboard shortcuts while editing:
// Tab - Indent list item
// Shift+Tab - Outdent list item
// Enter - New list item
// Enter on empty item - Exit list`}</CodeBlock>
      </Section>

      {/* Interactive Editing */}
      <Section title="Interactive Editing" id="interactive-editing">
        <Description>
          Click to start editing, with full keyboard support and rich text controls.
        </Description>
        <DemoContainer>
          <InteractiveEditingDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`const richText = new RichText({
  x: 100, y: 100,
  width: 400, height: 200,
  text: 'Click to edit...',
  editable: true,  // default: true
  draggable: true
});

// Listen to editing events
richText.on('editstart', () => {
  console.log('Started editing');
});

richText.on('editend', () => {
  console.log('Finished editing');
});

richText.on('textchange', () => {
  console.log('Text changed');
});

// Keyboard shortcuts available while editing:
// Ctrl+B - Bold, Ctrl+I - Italic, Ctrl+U - Underline
// Ctrl+Z - Undo, Ctrl+Y - Redo
// Ctrl+A - Select All`}</CodeBlock>
      </Section>

      {/* Advanced Styling */}
      <Section title="Advanced Styling" id="advanced-styling">
        <Description>
          Use advanced effects like text stroke, shadows, and highlights.
        </Description>
        <DemoContainer>
          <AdvancedStylingDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`// Text with stroke (outline)
richText.applyStyle({
  stroke: {
    color: '#000000',
    width: 2
  }
});

// Text with shadow
richText.applyStyle({
  shadow: {
    color: 'rgba(0,0,0,0.5)',
    blur: 4,
    offsetX: 2,
    offsetY: 2
  }
});

// Text with highlight (background color)
richText.applyStyle({
  backgroundColor: '#FFFF00'
});

// Combine multiple effects
richText.applyStyle({
  fontSize: 36,
  fontWeight: 'bold',
  color: '#FFFFFF',
  stroke: { color: '#000000', width: 3 },
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 8, offsetX: 3, offsetY: 3 }
});`}</CodeBlock>
      </Section>

      {/* Transformer Integration */}
      <Section title="Transformer Integration" id="transformer">
        <Description>
          Integrate with Konva.Transformer for visual resize and rotation handles.
        </Description>
        <DemoContainer>
          <TransformerDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`const layer = new Konva.Layer();
const transformer = new Konva.Transformer();
layer.add(transformer);

const richText = new RichText({
  x: 100, y: 100,
  width: 300, height: 200,
  text: 'Resize me!',
  draggable: true
});

layer.add(richText);

// Select on click
richText.on('click', () => {
  transformer.nodes([richText]);
  layer.batchDraw();
});

// Hide transformer while editing for better UX
richText.on('editstart', () => {
  transformer.nodes([]);
  layer.batchDraw();
});

richText.on('editend', () => {
  transformer.nodes([richText]);
  layer.batchDraw();
});`}</CodeBlock>
      </Section>

      {/* Multiple Text Boxes */}
      <Section title="Multiple Text Boxes" id="multiple-boxes">
        <Description>
          Manage multiple text boxes with selection and editing control.
        </Description>
        <DemoContainer>
          <MultipleBoxesDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`const textBoxes: RichText[] = [];

function createTextBox() {
  const richText = new RichText({
    x: 100 + textBoxes.length * 50,
    y: 100 + textBoxes.length * 50,
    width: 300,
    height: 150,
    text: \`Text Box \${textBoxes.length + 1}\`,
    draggable: true
  });

  layer.add(richText);
  textBoxes.push(richText);

  // Prevent multiple boxes from editing simultaneously
  richText.on('editstart', () => {
    textBoxes.forEach(box => {
      if (box !== richText) {
        box.stopEditing();
      }
    });
  });

  return richText;
}`}</CodeBlock>
      </Section>

      {/* Programmatic Control */}
      <Section title="Programmatic Control" id="programmatic">
        <Description>
          Control text and styles programmatically without user interaction.
        </Description>
        <DemoContainer>
          <ProgrammaticDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`// Change text programmatically
richText.setText('New text');

// Apply bold to all text
richText.toggleBold();

// Apply specific style
richText.applyStyle({
  fontSize: 24,
  color: '#FF0000'
});

// Get current text
const text = richText.getText();

// Undo/Redo
richText.undo();
richText.redo();

// Select all
richText.selectAll();

// Start/Stop editing
richText.startEditing();
richText.stopEditing();`}</CodeBlock>
      </Section>

      {/* Serialization */}
      <Section title="Serialization" id="serialization">
        <Description>
          Save and restore text boxes to/from JSON.
        </Description>
        <DemoContainer>
          <SerializationDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`// Export to JSON
const json = richText.toJSON();

// Save to storage
localStorage.setItem('myText', JSON.stringify(json));

// Later, restore from JSON
const savedJson = JSON.parse(localStorage.getItem('myText'));
const restored = RichText.fromJSON(savedJson);

layer.add(restored);

// Clone a text box
const cloned = richText.clone();
cloned.x(richText.x() + 50);
cloned.y(richText.y() + 50);
layer.add(cloned);`}</CodeBlock>
      </Section>

      {/* Complex Example */}
      <Section title="Complex Example: Document Editor" id="complex-example">
        <Description>
          A complete example showing multiple features working together.
        </Description>
        <DemoContainer fullHeight>
          <ComplexEditorDemo />
        </DemoContainer>
        <CodeBlock language="typescript">{`// Full-featured document editor
const stage = new Konva.Stage({
  container: 'container',
  width: 1200,
  height: 800
});

const layer = new Konva.Layer();
stage.add(layer);

const transformer = new Konva.Transformer();
layer.add(transformer);

const textBoxes: RichText[] = [];

// Create toolbar
function createToolbar() {
  return {
    bold: () => activeBox?.toggleBold(),
    italic: () => activeBox?.toggleItalic(),
    underline: () => activeBox?.toggleUnderline(),
    fontSize: (size) => activeBox?.applyStyle({ fontSize: size }),
    color: (color) => activeBox?.applyStyle({ color }),
    align: (align) => activeBox?.setAlign(align),
    bulletList: () => activeBox?.toggleBulletList(),
    numberedList: () => activeBox?.toggleNumberedList(),
  };
}

// Add text box button
function addTextBox() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 250,
    text: 'New text box...',
    draggable: true
  });

  layer.add(richText);
  textBoxes.push(richText);

  richText.on('click', () => {
    activeBox = richText;
    transformer.nodes([richText]);
  });

  richText.on('editstart', () => {
    transformer.nodes([]);
    textBoxes.forEach(b => b !== richText && b.stopEditing());
  });

  richText.on('editend', () => {
    transformer.nodes([richText]);
  });
}`}</CodeBlock>
      </Section>

      {/* Best Practices */}
      <Section title="Best Practices" id="best-practices">
        <Description>
          Tips for getting the most out of the RichText component.
        </Description>
        <BestPractices />
      </Section>

      {/* Footer */}
      <footer style={{
        marginTop: '80px',
        paddingTop: '40px',
        borderTop: '1px solid #eee',
        textAlign: 'center',
        color: '#666'
      }}>
        <p>For more information, see the <a href="../docs/RICHTEXT_COMPONENT.md" style={{ color: '#667eea' }}>complete documentation</a>.</p>
      </footer>
    </div>
  );
};

// ============================================================================
// Demo Components
// ============================================================================

const QuickStartDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 600,
      height: 300,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const richText = new RichText({
      x: 150,
      y: 100,
      width: 300,
      height: 100,
      text: 'Hello World!',
      style: { fontSize: 32, color: '#333', fontWeight: 'bold' },
      draggable: true,
    });

    layer.add(richText);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const BasicStylingDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 600,
      height: 250,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const richText = new RichText({
      x: 100,
      y: 50,
      width: 400,
      height: 150,
      text: 'Beautifully Styled Text',
      style: {
        fontSize: 36,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        color: '#FF6B6B',
        lineHeight: 1.5,
        letterSpacing: 2,
      },
      align: 'center',
      draggable: true,
    });

    layer.add(richText);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const AlignmentDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 900,
      height: 200,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];

    alignments.forEach((align, i) => {
      const richText = new RichText({
        x: 50 + i * 280,
        y: 40,
        width: 250,
        height: 120,
        text: `${align.toUpperCase()}\naligned text`,
        style: { fontSize: 20, lineHeight: 1.5 },
        align,
      });

      // Background box
      const bg = new Konva.Rect({
        x: 50 + i * 280,
        y: 40,
        width: 250,
        height: 120,
        stroke: '#ddd',
        strokeWidth: 1,
        dash: [5, 5],
      });

      layer.add(bg);
      layer.add(richText);
    });

    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const TransformationsDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 700,
      height: 400,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Normal
    const normal = new RichText({
      x: 80,
      y: 80,
      width: 150,
      height: 80,
      text: 'Normal',
      style: { fontSize: 24, fontWeight: 'bold' },
      align: 'center',
    });

    // Scaled
    const scaled = new RichText({
      x: 300,
      y: 80,
      width: 150,
      height: 80,
      text: 'Scaled',
      style: { fontSize: 24, fontWeight: 'bold' },
      align: 'center',
      scaleX: 1.3,
      scaleY: 1.3,
    });

    // Rotated
    const rotated = new RichText({
      x: 550,
      y: 120,
      width: 150,
      height: 80,
      text: 'Rotated',
      style: { fontSize: 24, fontWeight: 'bold' },
      align: 'center',
      rotation: 20,
    });

    layer.add(normal, scaled, rotated);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const CharacterStylingDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 700,
      height: 200,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const richText = new RichText({
      x: 50,
      y: 60,
      width: 600,
      height: 100,
      text: 'Character Level Styling',
      style: { fontSize: 42 },
    });

    let doc = richText.getDocument();

    // "Character" - Red and bold
    doc = applyStyleToRange(doc, 0, 9, {
      color: '#FF0000',
      fontWeight: 'bold',
    });

    // "Level" - Green and italic
    doc = applyStyleToRange(doc, 10, 15, {
      color: '#00AA00',
      fontStyle: 'italic',
    });

    // "Styling" - Blue and underlined
    doc = applyStyleToRange(doc, 16, 23, {
      color: '#0000FF',
      underline: true,
    });

    richText.setDocument(doc);
    layer.add(richText);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const ListsDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 800,
      height: 300,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const bulletList = new RichText({
      x: 50,
      y: 40,
      width: 350,
      height: 220,
      text: 'Features:\nRich text editing\nCharacter styling\nFull keyboard support\nUndo/Redo',
      style: { fontSize: 18, lineHeight: 1.6 },
      draggable: true,
    });

    bulletList.toggleBulletList();

    const numberedList = new RichText({
      x: 430,
      y: 40,
      width: 350,
      height: 220,
      text: 'Steps:\nCreate RichText instance\nAdd to Konva layer\nConfigure styling\nEnjoy!',
      style: { fontSize: 18, lineHeight: 1.6 },
      draggable: true,
    });

    numberedList.toggleNumberedList();

    layer.add(bulletList, numberedList);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const InteractiveEditingDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Click the text to start editing');

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 700,
      height: 250,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const richText = new RichText({
      x: 80,
      y: 50,
      width: 540,
      height: 150,
      text: 'Click here to edit!\n\nTry: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline)',
      style: { fontSize: 20, lineHeight: 1.5 },
      draggable: false,
    });

    richText.on('editstart', () => {
      setStatus('✏️ Editing... (Press Escape to stop)');
    });

    richText.on('editend', () => {
      setStatus('✓ Editing finished - Click again to edit');
    });

    layer.add(richText);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return (
    <>
      <div style={{
        padding: '12px',
        marginBottom: '12px',
        backgroundColor: '#f0f7ff',
        border: '1px solid #b3d9ff',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        {status}
      </div>
      <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />
    </>
  );
};

const AdvancedStylingDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 800,
      height: 350,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Stroke
    const stroke = new RichText({
      x: 50,
      y: 40,
      width: 350,
      height: 100,
      text: 'STROKE',
      style: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        stroke: { color: '#000000', width: 3 },
      },
      align: 'center',
    });

    // Shadow
    const shadow = new RichText({
      x: 420,
      y: 40,
      width: 350,
      height: 100,
      text: 'SHADOW',
      style: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#333333',
        shadow: { color: 'rgba(0,0,0,0.5)', blur: 8, offsetX: 4, offsetY: 4 },
      },
      align: 'center',
    });

    // Highlight
    const highlight = new RichText({
      x: 200,
      y: 180,
      width: 400,
      height: 100,
      text: 'Highlighted Text',
      style: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#000000',
        backgroundColor: '#FFFF00',
      },
      align: 'center',
    });

    layer.add(stroke, shadow, highlight);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const TransformerDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 700,
      height: 400,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const transformer = new Konva.Transformer();
    layer.add(transformer);

    const richText = new RichText({
      x: 150,
      y: 100,
      width: 400,
      height: 200,
      text: 'Click to select, then drag handles to resize!\n\nYou can also rotate using the handle above.',
      style: { fontSize: 22, lineHeight: 1.5 },
      draggable: true,
    });

    layer.add(richText);

    richText.on('click', () => {
      transformer.nodes([richText]);
      layer.batchDraw();
    });

    richText.on('editstart', () => {
      transformer.nodes([]);
      layer.batchDraw();
    });

    richText.on('editend', () => {
      transformer.nodes([richText]);
      layer.batchDraw();
    });

    // Auto-select
    transformer.nodes([richText]);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const MultipleBoxesDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 800,
      height: 400,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const transformer = new Konva.Transformer();
    layer.add(transformer);

    const textBoxes: RichText[] = [];

    for (let i = 0; i < 3; i++) {
      const richText = new RichText({
        x: 100 + i * 220,
        y: 80 + i * 60,
        width: 200,
        height: 150,
        text: `Text Box ${i + 1}\n\nClick to select and edit!`,
        style: { fontSize: 18, lineHeight: 1.5 },
        draggable: true,
      });

      layer.add(richText);
      textBoxes.push(richText);

      richText.on('click', (e) => {
        e.cancelBubble = true;
        transformer.nodes([richText]);
        layer.batchDraw();
      });

      richText.on('editstart', () => {
        textBoxes.forEach(box => box !== richText && box.stopEditing());
        transformer.nodes([]);
        layer.batchDraw();
      });

      richText.on('editend', () => {
        transformer.nodes([richText]);
        layer.batchDraw();
      });
    }

    stage.on('click', (e) => {
      if (e.target === stage) {
        transformer.nodes([]);
        textBoxes.forEach(box => box.stopEditing());
        layer.batchDraw();
      }
    });

    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />;
};

const ProgrammaticDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const richTextRef = useRef<RichText | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 700,
      height: 300,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const richText = new RichText({
      x: 100,
      y: 80,
      width: 500,
      height: 140,
      text: 'Click buttons below to control this text programmatically!',
      style: { fontSize: 24, lineHeight: 1.5 },
      align: 'center',
    });

    richTextRef.current = richText;

    layer.add(richText);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
        <Button onClick={() => richTextRef.current?.toggleBold()}>Toggle Bold</Button>
        <Button onClick={() => richTextRef.current?.toggleItalic()}>Toggle Italic</Button>
        <Button onClick={() => richTextRef.current?.applyStyle({ color: '#FF0000' })}>Red</Button>
        <Button onClick={() => richTextRef.current?.applyStyle({ color: '#0000FF' })}>Blue</Button>
        <Button onClick={() => richTextRef.current?.applyStyle({ fontSize: 32 })}>Bigger</Button>
        <Button onClick={() => richTextRef.current?.applyStyle({ fontSize: 16 })}>Smaller</Button>
        <Button onClick={() => richTextRef.current?.setAlign('left')}>Left</Button>
        <Button onClick={() => richTextRef.current?.setAlign('center')}>Center</Button>
        <Button onClick={() => richTextRef.current?.setAlign('right')}>Right</Button>
      </div>
    </>
  );
};

const SerializationDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [savedData, setSavedData] = useState<any>(null);
  const richTextRef = useRef<RichText | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 700,
      height: 300,
    });

    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;

    const richText = new RichText({
      x: 100,
      y: 80,
      width: 500,
      height: 140,
      text: 'Edit this text, then click "Save to JSON"!',
      style: { fontSize: 22, lineHeight: 1.5 },
      draggable: true,
    });

    richTextRef.current = richText;
    layer.add(richText);
    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  const handleSave = () => {
    if (richTextRef.current) {
      const json = richTextRef.current.toJSON();
      setSavedData(json);
    }
  };

  const handleRestore = () => {
    if (savedData && layerRef.current) {
      // Remove old
      richTextRef.current?.destroy();

      // Restore from JSON
      const restored = RichText.fromJSON(savedData);
      richTextRef.current = restored;
      layerRef.current.add(restored);
      layerRef.current.batchDraw();
    }
  };

  return (
    <>
      <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <Button onClick={handleSave}>Save to JSON</Button>
        <Button onClick={handleRestore} disabled={!savedData}>Restore from JSON</Button>
      </div>
      {savedData && (
        <pre style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '6px',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '150px'
        }}>
          {JSON.stringify(savedData, null, 2)}
        </pre>
      )}
    </>
  );
};

const ComplexEditorDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeBox, setActiveBox] = useState<RichText | null>(null);
  const textBoxesRef = useRef<RichText[]>([]);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 1100,
      height: 600,
    });

    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;

    const transformer = new Konva.Transformer();
    layer.add(transformer);
    transformerRef.current = transformer;

    // Initial text box
    createTextBox(layer, transformer, 100, 100);

    stage.on('click', (e) => {
      if (e.target === stage) {
        setActiveBox(null);
        transformer.nodes([]);
        textBoxesRef.current.forEach(box => box.stopEditing());
        layer.batchDraw();
      }
    });

    layer.batchDraw();

    return () => stage.destroy();
  }, []);

  const createTextBox = (
    layer: Konva.Layer,
    transformer: Konva.Transformer,
    x: number = 100,
    y: number = 100
  ) => {
    const richText = new RichText({
      x,
      y,
      width: 350,
      height: 200,
      text: `Text Box ${textBoxesRef.current.length + 1}\n\nClick to select, double-click to edit!`,
      style: { fontSize: 18, lineHeight: 1.5 },
      draggable: true,
    });

    layer.add(richText);
    textBoxesRef.current.push(richText);

    richText.on('click', (e) => {
      e.cancelBubble = true;
      setActiveBox(richText);
      transformer.nodes([richText]);
      layer.batchDraw();
    });

    richText.on('editstart', () => {
      textBoxesRef.current.forEach(box => box !== richText && box.stopEditing());
      transformer.nodes([]);
      layer.batchDraw();
    });

    richText.on('editend', () => {
      transformer.nodes([richText]);
      layer.batchDraw();
    });

    setActiveBox(richText);
    transformer.nodes([richText]);
    layer.batchDraw();
  };

  const handleAddBox = () => {
    if (layerRef.current && transformerRef.current) {
      const offset = textBoxesRef.current.length * 40;
      createTextBox(layerRef.current, transformerRef.current, 150 + offset, 100 + offset);
    }
  };

  return (
    <>
      <div style={{
        padding: '16px',
        marginBottom: '16px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <Button onClick={handleAddBox}>+ Add Text Box</Button>
        <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd' }} />
        <Button onClick={() => activeBox?.toggleBold()} disabled={!activeBox}>Bold</Button>
        <Button onClick={() => activeBox?.toggleItalic()} disabled={!activeBox}>Italic</Button>
        <Button onClick={() => activeBox?.toggleUnderline()} disabled={!activeBox}>Underline</Button>
        <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd' }} />
        <Button onClick={() => activeBox?.setAlign('left')} disabled={!activeBox}>Left</Button>
        <Button onClick={() => activeBox?.setAlign('center')} disabled={!activeBox}>Center</Button>
        <Button onClick={() => activeBox?.setAlign('right')} disabled={!activeBox}>Right</Button>
        <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd' }} />
        <Button onClick={() => activeBox?.toggleBulletList()} disabled={!activeBox}>• List</Button>
        <Button onClick={() => activeBox?.toggleNumberedList()} disabled={!activeBox}>1. List</Button>
        <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd' }} />
        <select
          onChange={(e) => activeBox?.applyStyle({ fontSize: parseInt(e.target.value) })}
          disabled={!activeBox}
          style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18" selected>18px</option>
          <option value="24">24px</option>
          <option value="32">32px</option>
        </select>
        <input
          type="color"
          onChange={(e) => activeBox?.applyStyle({ color: e.target.value })}
          disabled={!activeBox}
          style={{ width: '40px', height: '32px', cursor: 'pointer' }}
        />
      </div>
      <div ref={containerRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />
    </>
  );
};

const BestPractices: React.FC = () => {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Practice
        title="1. Always Destroy When Removing"
        description="Call destroy() when removing text boxes to prevent memory leaks."
        code={`richText.destroy();`}
      />

      <Practice
        title="2. Prevent Multiple Editors"
        description="Stop editing on other boxes when starting a new one."
        code={`richText.on('editstart', () => {
  textBoxes.forEach(box => {
    if (box !== richText) {
      box.stopEditing();
    }
  });
});`}
      />

      <Practice
        title="3. Hide Transformer While Editing"
        description="Improves UX by hiding resize handles during text editing."
        code={`richText.on('editstart', () => {
  transformer.nodes([]);
});

richText.on('editend', () => {
  transformer.nodes([richText]);
});`}
      />

      <Practice
        title="4. Use Method Chaining"
        description="Many methods return 'this' for convenient chaining."
        code={`richText
  .setText('New text')
  .applyStyle({ fontSize: 24 })
  .setAlign('center')
  .scaleUniform(1.5);`}
      />

      <Practice
        title="5. Work with Documents for Character Styling"
        description="Get document, modify it, then set it back."
        code={`let doc = richText.getDocument();
doc = applyStyleToRange(doc, 0, 5, { color: 'red' });
richText.setDocument(doc);`}
      />
    </div>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

const Section: React.FC<{
  title: string;
  id: string;
  children: React.ReactNode
}> = ({ title, id, children }) => {
  return (
    <section id={id} style={{ marginBottom: '60px' }}>
      <h2 style={{
        fontSize: '32px',
        fontWeight: 'bold',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid #eee'
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
};

const Description: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <p style={{
      fontSize: '16px',
      lineHeight: '1.6',
      color: '#666',
      marginBottom: '24px'
    }}>
      {children}
    </p>
  );
};

const DemoContainer: React.FC<{
  children: React.ReactNode;
  fullHeight?: boolean;
}> = ({ children, fullHeight }) => {
  return (
    <div style={{
      marginBottom: '24px',
      padding: fullHeight ? '0' : '24px',
      backgroundColor: '#fafafa',
      borderRadius: '8px'
    }}>
      {children}
    </div>
  );
};

const CodeBlock: React.FC<{
  language: string;
  children: string
}> = ({ children }) => {
  return (
    <pre style={{
      padding: '20px',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      borderRadius: '8px',
      overflow: 'auto',
      fontSize: '14px',
      lineHeight: '1.5',
      marginBottom: '20px'
    }}>
      <code>{children}</code>
    </pre>
  );
};

const Button: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, children }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        backgroundColor: disabled ? '#e0e0e0' : '#667eea',
        color: disabled ? '#999' : 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#5568d3';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#667eea';
        }
      }}
    >
      {children}
    </button>
  );
};

const Practice: React.FC<{
  title: string;
  description: string;
  code: string;
}> = ({ title, description, code }) => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      borderLeft: '4px solid #667eea'
    }}>
      <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
        {title}
      </h4>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
        {description}
      </p>
      <pre style={{
        padding: '12px',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        borderRadius: '6px',
        fontSize: '13px',
        overflow: 'auto'
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default ExamplesPage;
