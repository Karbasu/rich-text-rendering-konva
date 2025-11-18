/**
 * Character-Level Editing Demo
 *
 * This demo shows the character-level editing capabilities of RichText
 */

import React, { useEffect, useRef } from 'react';
import Konva from 'konva';
import { RichText } from '../src/components';
import { applyStyleToRange } from '../src/rich-text';

const CharacterLevelDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 1200,
      height: 800,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // ============================================================
    // Demo 1: Rainbow Text (each character different color)
    // ============================================================
    const rainbow = new RichText({
      x: 50,
      y: 50,
      width: 500,
      height: 80,
      text: 'RAINBOW',
      style: { fontSize: 48, fontWeight: 'bold' },
    });

    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
    let rainbowDoc = rainbow.getDocument();

    for (let i = 0; i < 7; i++) {
      rainbowDoc = applyStyleToRange(rainbowDoc, i, i + 1, { color: colors[i] });
    }
    rainbow.setDocument(rainbowDoc);

    layer.add(rainbow);

    // Label
    const label1 = new Konva.Text({
      x: 50,
      y: 30,
      text: 'Each character has different color:',
      fontSize: 14,
      fill: '#666',
    });
    layer.add(label1);

    // ============================================================
    // Demo 2: Mixed Styles (bold, italic, underline per char)
    // ============================================================
    const mixed = new RichText({
      x: 50,
      y: 180,
      width: 500,
      height: 80,
      text: 'BoldItalicUnderline',
      style: { fontSize: 32 },
    });

    let mixedDoc = mixed.getDocument();
    // "Bold" - bold
    mixedDoc = applyStyleToRange(mixedDoc, 0, 4, { fontWeight: 'bold', color: '#FF0000' });
    // "Italic" - italic
    mixedDoc = applyStyleToRange(mixedDoc, 4, 10, { fontStyle: 'italic', color: '#00FF00' });
    // "Underline" - underline
    mixedDoc = applyStyleToRange(mixedDoc, 10, 19, { underline: true, color: '#0000FF' });

    mixed.setDocument(mixedDoc);
    layer.add(mixed);

    const label2 = new Konva.Text({
      x: 50,
      y: 160,
      text: 'Different styles applied to different character ranges:',
      fontSize: 14,
      fill: '#666',
    });
    layer.add(label2);

    // ============================================================
    // Demo 3: Gradient Size (each char progressively larger)
    // ============================================================
    const gradient = new RichText({
      x: 50,
      y: 310,
      width: 600,
      height: 100,
      text: 'Growing',
      style: { fontSize: 16 },
    });

    let gradientDoc = gradient.getDocument();
    const growingText = 'Growing';

    for (let i = 0; i < growingText.length; i++) {
      const fontSize = 20 + i * 8;
      gradientDoc = applyStyleToRange(gradientDoc, i, i + 1, { fontSize });
    }

    gradient.setDocument(gradientDoc);
    layer.add(gradient);

    const label3 = new Konva.Text({
      x: 50,
      y: 290,
      text: 'Each character has progressively larger font size:',
      fontSize: 14,
      fill: '#666',
    });
    layer.add(label3);

    // ============================================================
    // Demo 4: Highlight Vowels
    // ============================================================
    const highlight = new RichText({
      x: 50,
      y: 460,
      width: 700,
      height: 80,
      text: 'Highlighting specific characters like vowels',
      style: { fontSize: 24 },
    });

    let highlightDoc = highlight.getDocument();
    const highlightText = 'Highlighting specific characters like vowels';
    const vowels = ['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'];

    for (let i = 0; i < highlightText.length; i++) {
      if (vowels.includes(highlightText[i])) {
        highlightDoc = applyStyleToRange(highlightDoc, i, i + 1, {
          backgroundColor: '#FFFF00',
          fontWeight: 'bold',
          color: '#FF0000',
        });
      }
    }

    highlight.setDocument(highlightDoc);
    layer.add(highlight);

    const label4 = new Konva.Text({
      x: 50,
      y: 440,
      text: 'Vowels highlighted with different background color:',
      fontSize: 14,
      fill: '#666',
    });
    layer.add(label4);

    // ============================================================
    // Demo 5: Alternating Styles
    // ============================================================
    const alternating = new RichText({
      x: 50,
      y: 590,
      width: 600,
      height: 80,
      text: 'AlternatingStyles',
      style: { fontSize: 36 },
    });

    let altDoc = alternating.getDocument();
    const altText = 'AlternatingStyles';

    for (let i = 0; i < altText.length; i++) {
      if (i % 2 === 0) {
        altDoc = applyStyleToRange(altDoc, i, i + 1, {
          color: '#FF0000',
          fontWeight: 'bold',
        });
      } else {
        altDoc = applyStyleToRange(altDoc, i, i + 1, {
          color: '#0000FF',
          fontStyle: 'italic',
        });
      }
    }

    alternating.setDocument(altDoc);
    layer.add(alternating);

    const label5 = new Konva.Text({
      x: 50,
      y: 570,
      text: 'Alternating bold/italic and red/blue per character:',
      fontSize: 14,
      fill: '#666',
    });
    layer.add(label5);

    // ============================================================
    // Demo 6: Editable with Character-Level Selection
    // ============================================================
    const editable = new RichText({
      x: 650,
      y: 50,
      width: 500,
      height: 150,
      text: 'Try selecting individual characters!\n\nYou can select any range and apply styles character by character.',
      style: { fontSize: 18, lineHeight: 1.5 },
      draggable: true,
    });

    layer.add(editable);

    const transformer = new Konva.Transformer();
    layer.add(transformer);

    editable.on('click', () => {
      transformer.nodes([editable]);
    });

    editable.on('editstart', () => {
      transformer.nodes([]);
    });

    editable.on('editend', () => {
      transformer.nodes([editable]);
    });

    const label6 = new Konva.Text({
      x: 650,
      y: 30,
      text: 'Interactive character-level editing:',
      fontSize: 14,
      fill: '#666',
      fontWeight: 'bold',
    });
    layer.add(label6);

    // Info box
    const infoBox = new Konva.Rect({
      x: 650,
      y: 220,
      width: 500,
      height: 200,
      fill: '#F0F0F0',
      stroke: '#999',
      strokeWidth: 1,
      cornerRadius: 5,
    });
    layer.add(infoBox);

    const info = new Konva.Text({
      x: 670,
      y: 240,
      width: 460,
      text: '✓ Each character can have unique styling\n✓ Font size, color, weight, style per character\n✓ Background colors (highlights) per character\n✓ Selection works at character level\n✓ Apply styles to any character range\n✓ Mix and match any combination of styles\n\nUse applyStyleToRange(doc, start, end, style) to style specific character ranges.',
      fontSize: 16,
      lineHeight: 1.6,
      fill: '#333',
    });
    layer.add(info);

    layer.batchDraw();

    return () => {
      stage.destroy();
    };
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff' }}>
      <h1>Character-Level Editing Demo</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        The RichText component supports full character-level editing. Each character can have
        completely different styling.
      </p>
      <div
        ref={containerRef}
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
        <h3>Key Features:</h3>
        <ul>
          <li>Apply different styles to individual characters</li>
          <li>Each character can have unique font, size, color, weight, style</li>
          <li>Background colors (highlights) work per character</li>
          <li>Selection and editing operate at character precision</li>
          <li>Perfect for syntax highlighting, rainbow text, and custom effects</li>
        </ul>
      </div>
    </div>
  );
};

export default CharacterLevelDemo;
