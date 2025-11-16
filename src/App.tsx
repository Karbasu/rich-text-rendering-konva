import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { RichTextNode, createDocument, TextAlign } from './rich-text';

interface ToolbarProps {
  activeNode: RichTextNode | null;
  onAddTextBox: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeNode, onAddTextBox }) => {
  const [currentAlign, setCurrentAlign] = useState<TextAlign>('left');

  const handleBold = () => {
    activeNode?.toggleBold();
  };

  const handleItalic = () => {
    activeNode?.toggleItalic();
  };

  const handleUnderline = () => {
    activeNode?.toggleUnderline();
  };

  const handleAlign = (align: TextAlign) => {
    activeNode?.setAlign(align);
    setCurrentAlign(align);
  };

  const handleFontSize = (size: number) => {
    activeNode?.applyStyle({ fontSize: size });
  };

  const handleColor = (color: string) => {
    activeNode?.applyStyle({ color });
  };

  const handleFontFamily = (family: string) => {
    activeNode?.applyStyle({ fontFamily: family });
  };

  const handleStroke = () => {
    activeNode?.applyStyle({
      stroke: { color: '#000000', width: 2 },
    });
  };

  const handleShadow = () => {
    activeNode?.applyStyle({
      shadow: { color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 2, offsetY: 2 },
    });
  };

  const handleLetterSpacing = (spacing: number) => {
    activeNode?.applyStyle({ letterSpacing: spacing });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: '#2d2d2d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '8px',
        borderBottom: '1px solid #444',
        zIndex: 100,
      }}
    >
      <button
        onClick={onAddTextBox}
        style={{
          padding: '8px 16px',
          background: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        + Add Text
      </button>

      <div style={{ width: '1px', height: '30px', background: '#555' }} />

      <select
        onChange={(e) => handleFontFamily(e.target.value)}
        style={{
          padding: '6px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
        }}
        disabled={!activeNode}
      >
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Georgia">Georgia</option>
        <option value="Verdana">Verdana</option>
        <option value="Courier New">Courier New</option>
        <option value="Impact">Impact</option>
      </select>

      <select
        onChange={(e) => handleFontSize(parseInt(e.target.value))}
        style={{
          padding: '6px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          width: '70px',
        }}
        disabled={!activeNode}
        defaultValue="16"
      >
        {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map((size) => (
          <option key={size} value={size}>
            {size}px
          </option>
        ))}
      </select>

      <button
        onClick={handleBold}
        style={{
          padding: '6px 12px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
        disabled={!activeNode}
        title="Bold (Ctrl+B)"
      >
        B
      </button>

      <button
        onClick={handleItalic}
        style={{
          padding: '6px 12px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
          fontStyle: 'italic',
        }}
        disabled={!activeNode}
        title="Italic (Ctrl+I)"
      >
        I
      </button>

      <button
        onClick={handleUnderline}
        style={{
          padding: '6px 12px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
        disabled={!activeNode}
        title="Underline (Ctrl+U)"
      >
        U
      </button>

      <div style={{ width: '1px', height: '30px', background: '#555' }} />

      <button
        onClick={() => handleAlign('left')}
        style={{
          padding: '6px 12px',
          background: currentAlign === 'left' ? '#4285f4' : '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!activeNode}
      >
        ≡
      </button>

      <button
        onClick={() => handleAlign('center')}
        style={{
          padding: '6px 12px',
          background: currentAlign === 'center' ? '#4285f4' : '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!activeNode}
      >
        ≡
      </button>

      <button
        onClick={() => handleAlign('right')}
        style={{
          padding: '6px 12px',
          background: currentAlign === 'right' ? '#4285f4' : '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!activeNode}
      >
        ≡
      </button>

      <button
        onClick={() => handleAlign('justify')}
        style={{
          padding: '6px 12px',
          background: currentAlign === 'justify' ? '#4285f4' : '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!activeNode}
      >
        ≡≡
      </button>

      <div style={{ width: '1px', height: '30px', background: '#555' }} />

      <input
        type="color"
        defaultValue="#000000"
        onChange={(e) => handleColor(e.target.value)}
        style={{
          width: '36px',
          height: '30px',
          padding: '2px',
          background: '#3d3d3d',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!activeNode}
        title="Text Color"
      />

      <button
        onClick={handleStroke}
        style={{
          padding: '6px 12px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!activeNode}
        title="Add Stroke"
      >
        Stroke
      </button>

      <button
        onClick={handleShadow}
        style={{
          padding: '6px 12px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!activeNode}
        title="Add Shadow"
      >
        Shadow
      </button>

      <select
        onChange={(e) => handleLetterSpacing(parseInt(e.target.value))}
        style={{
          padding: '6px',
          background: '#3d3d3d',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
        }}
        disabled={!activeNode}
        defaultValue="0"
      >
        <option value="0">Spacing: 0</option>
        <option value="1">Spacing: 1</option>
        <option value="2">Spacing: 2</option>
        <option value="4">Spacing: 4</option>
        <option value="8">Spacing: 8</option>
      </select>

      <div style={{ flex: 1 }} />

      <div style={{ color: '#888', fontSize: '12px' }}>
        <strong>Shortcuts:</strong> Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline), Ctrl+Z
        (Undo), Ctrl+Y (Redo), Ctrl+A (Select All)
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [activeNode, setActiveNode] = useState<RichTextNode | null>(null);
  const textNodesRef = useRef<RichTextNode[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create stage
    const stage = new Konva.Stage({
      container: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight - 60,
    });
    stageRef.current = stage;

    // Create layer
    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;

    // Create transformer
    const transformer = new Konva.Transformer({
      rotateEnabled: true,
      enabledAnchors: [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'middle-left',
        'middle-right',
        'top-center',
        'bottom-center',
      ],
      boundBoxFunc: (oldBox, newBox) => {
        // Limit resize
        if (newBox.width < 50 || newBox.height < 30) {
          return oldBox;
        }
        return newBox;
      },
    });
    layer.add(transformer);
    transformerRef.current = transformer;

    // Create initial text box with sample content
    const initialDoc = createDocument(
      'Welcome to the Rich Text Editor!\n\nThis is a fully custom text engine built on Konva.js canvas.\n\nFeatures:\n• Multi-line text with reflow\n• Per-character styling\n• Full keyboard editing\n• Mouse selection\n• Undo/Redo support\n• Resizable text boxes\n• Rotate & transform\n\nClick to edit, drag to select!',
      {
        fontSize: 18,
        fontFamily: 'Arial',
        color: '#333333',
        lineHeight: 1.5,
      }
    );

    const textNode = new RichTextNode({
      x: 100,
      y: 100,
      width: 400,
      height: 450,
      document: initialDoc,
      draggable: true,
    });

    layer.add(textNode);
    textNodesRef.current.push(textNode);

    // Setup selection handling
    textNode.on('click', (e) => {
      e.cancelBubble = true;
      setActiveNode(textNode);
      transformer.nodes([textNode as unknown as Konva.Group]);
      layer.batchDraw();
    });

    textNode.on('editstart', () => {
      // Stop editing on all other text nodes
      textNodesRef.current.forEach((node) => {
        if (node !== textNode) {
          node.stopEditing();
        }
      });
      // Hide transformer handles while editing
      transformer.nodes([]);
      layer.batchDraw();
    });

    textNode.on('editend', () => {
      transformer.nodes([textNode as unknown as Konva.Group]);
      layer.batchDraw();
    });

    // Click on empty space to deselect
    stage.on('click', (e) => {
      if (e.target === stage) {
        // Clicked on empty space
        textNodesRef.current.forEach((node) => node.stopEditing());
        setActiveNode(null);
        transformer.nodes([]);
        layer.batchDraw();
      }
    });

    // Handle window resize
    const handleResize = () => {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight - 60);
      layer.batchDraw();
    };

    window.addEventListener('resize', handleResize);

    layer.batchDraw();

    return () => {
      window.removeEventListener('resize', handleResize);
      stage.destroy();
    };
  }, []);

  const handleAddTextBox = () => {
    if (!layerRef.current || !transformerRef.current) return;

    const newDoc = createDocument('New text box\n\nDouble-click to edit...', {
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
    });

    const textNode = new RichTextNode({
      x: 150 + textNodesRef.current.length * 50,
      y: 150 + textNodesRef.current.length * 50,
      width: 300,
      height: 200,
      document: newDoc,
      draggable: true,
    });

    layerRef.current.add(textNode);
    textNodesRef.current.push(textNode);

    // Setup selection handling for new node
    textNode.on('click', (e) => {
      e.cancelBubble = true;
      setActiveNode(textNode);
      transformerRef.current!.nodes([textNode as unknown as Konva.Group]);
      layerRef.current!.batchDraw();
    });

    textNode.on('editstart', () => {
      // Stop editing on all other text nodes
      textNodesRef.current.forEach((node) => {
        if (node !== textNode) {
          node.stopEditing();
        }
      });
      transformerRef.current!.nodes([]);
      layerRef.current!.batchDraw();
    });

    textNode.on('editend', () => {
      transformerRef.current!.nodes([textNode as unknown as Konva.Group]);
      layerRef.current!.batchDraw();
    });

    setActiveNode(textNode);
    transformerRef.current.nodes([textNode as unknown as Konva.Group]);
    layerRef.current.batchDraw();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Toolbar activeNode={activeNode} onAddTextBox={handleAddTextBox} />
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 60px)',
          marginTop: '60px',
          background: '#f0f0f0',
        }}
      />
    </div>
  );
};

export default App;
