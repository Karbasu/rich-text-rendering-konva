// ============================================================================
// Character-Level Editing Examples
// ============================================================================

import Konva from 'konva';
import { RichText } from '../src/components';

/**
 * This file demonstrates the character-level editing capabilities
 * of the RichText component
 */

// ============================================================================
// Example 1: Apply Style to Specific Character Range
// ============================================================================

export function example1_StyleSpecificCharacters() {
  const layer = new Konva.Layer();

  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: 'Hello World! This is character-level editing.',
    style: { fontSize: 18 },
  });

  layer.add(richText);

  // Get the underlying document
  const doc = richText.getDocument();

  // Apply bold to characters 0-5 ("Hello")
  // applyStyleToRange works at the character level
  import { applyStyleToRange } from '../src/rich-text';

  const styledDoc1 = applyStyleToRange(doc, 0, 5, { fontWeight: 'bold' });
  richText.setDocument(styledDoc1);

  // Apply red color to characters 6-11 ("World")
  const styledDoc2 = applyStyleToRange(styledDoc1, 6, 11, { color: '#FF0000' });
  richText.setDocument(styledDoc2);

  // Apply italic to characters 13-17 ("This")
  const styledDoc3 = applyStyleToRange(styledDoc2, 13, 17, { fontStyle: 'italic' });
  richText.setDocument(styledDoc3);

  return richText;
}

// ============================================================================
// Example 2: Per-Character Different Styles (Rainbow Text)
// ============================================================================

export function example2_RainbowText() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: 'RAINBOW',
    style: { fontSize: 48, fontWeight: 'bold' },
  });

  const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];

  let doc = richText.getDocument();

  // Apply different color to each character
  for (let i = 0; i < 7; i++) {
    import { applyStyleToRange } from '../src/rich-text';
    doc = applyStyleToRange(doc, i, i + 1, { color: colors[i] });
  }

  richText.setDocument(doc);
  return richText;
}

// ============================================================================
// Example 3: Mixed Styles Within a Word
// ============================================================================

export function example3_MixedStylesWithinWord() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: 'JavaScript',
    style: { fontSize: 36 },
  });

  let doc = richText.getDocument();

  import { applyStyleToRange } from '../src/rich-text';

  // Style "Java" differently from "Script"
  doc = applyStyleToRange(doc, 0, 4, {
    color: '#FF0000',
    fontWeight: 'bold'
  });

  doc = applyStyleToRange(doc, 4, 10, {
    color: '#0000FF',
    fontStyle: 'italic'
  });

  richText.setDocument(doc);
  return richText;
}

// ============================================================================
// Example 4: Character-by-Character Size Variation
// ============================================================================

export function example4_VariableCharacterSizes() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 600,
    height: 200,
    text: 'Growing Text',
    style: { fontSize: 16 },
  });

  let doc = richText.getDocument();
  const text = 'Growing Text';

  import { applyStyleToRange } from '../src/rich-text';

  // Each character gets progressively larger
  for (let i = 0; i < text.length; i++) {
    const fontSize = 16 + i * 3; // 16, 19, 22, 25, etc.
    doc = applyStyleToRange(doc, i, i + 1, { fontSize });
  }

  richText.setDocument(doc);
  return richText;
}

// ============================================================================
// Example 5: Alternating Character Styles
// ============================================================================

export function example5_AlternatingStyles() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: 'Alternating Bold and Italic',
    style: { fontSize: 24 },
  });

  let doc = richText.getDocument();
  const text = richText.getText();

  import { applyStyleToRange } from '../src/rich-text';

  // Alternate between bold and italic for each character
  for (let i = 0; i < text.length; i++) {
    if (i % 2 === 0) {
      doc = applyStyleToRange(doc, i, i + 1, { fontWeight: 'bold' });
    } else {
      doc = applyStyleToRange(doc, i, i + 1, { fontStyle: 'italic' });
    }
  }

  richText.setDocument(doc);
  return richText;
}

// ============================================================================
// Example 6: Highlight Specific Characters
// ============================================================================

export function example6_HighlightCharacters() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: 'Find and highlight all vowels: a, e, i, o, u',
    style: { fontSize: 18 },
  });

  let doc = richText.getDocument();
  const text = richText.getText();
  const vowels = ['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'];

  import { applyStyleToRange } from '../src/rich-text';

  // Highlight each vowel
  for (let i = 0; i < text.length; i++) {
    if (vowels.includes(text[i])) {
      doc = applyStyleToRange(doc, i, i + 1, {
        backgroundColor: '#FFFF00',
        fontWeight: 'bold'
      });
    }
  }

  richText.setDocument(doc);
  return richText;
}

// ============================================================================
// Example 7: Character-Level Animation Setup
// ============================================================================

export function example7_CharacterAnimationSetup() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: 'Animated',
    style: { fontSize: 32 },
  });

  // Function to animate individual characters
  function animateCharacter(charIndex: number, color: string) {
    let doc = richText.getDocument();
    import { applyStyleToRange } from '../src/rich-text';
    doc = applyStyleToRange(doc, charIndex, charIndex + 1, { color });
    richText.setDocument(doc);
  }

  // Example: Animate each character sequentially
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
  let currentChar = 0;

  const interval = setInterval(() => {
    if (currentChar < richText.getText().length) {
      animateCharacter(currentChar, colors[currentChar % colors.length]);
      currentChar++;
    } else {
      clearInterval(interval);
    }
  }, 200);

  return richText;
}

// ============================================================================
// Example 8: Build Custom Styled Document Character by Character
// ============================================================================

export function example8_CustomStyledDocument() {
  import { applyStyleToRange } from '../src/rich-text';

  const richText = new RichText({
    x: 100,
    y: 100,
    width: 500,
    height: 200,
    text: 'Every character can have unique styling!',
    style: { fontSize: 20 },
  });

  let doc = richText.getDocument();
  const text = richText.getText();

  // Apply completely different styles to each character
  for (let i = 0; i < text.length; i++) {
    const hue = (i * 360) / text.length; // Color gradient
    const fontSize = 16 + (i % 10); // Varying sizes

    doc = applyStyleToRange(doc, i, i + 1, {
      color: `hsl(${hue}, 100%, 50%)`,
      fontSize: fontSize,
      fontWeight: i % 2 === 0 ? 'bold' : 'normal',
      fontStyle: i % 3 === 0 ? 'italic' : 'normal',
    });
  }

  richText.setDocument(doc);
  return richText;
}

// ============================================================================
// Example 9: Interactive Character Selection and Styling
// ============================================================================

export function example9_InteractiveCharacterStyling() {
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: 'Click on this text to style individual characters',
    style: { fontSize: 18 },
  });

  // When user selects a range, you can style exactly those characters
  richText.on('editend', () => {
    // User can select any range and apply styles
    // The selection works at character level
    console.log('User finished editing - selection is character-precise');
  });

  return richText;
}

// ============================================================================
// Example 10: Syntax Highlighting (Character-Level)
// ============================================================================

export function example10_SyntaxHighlighting() {
  import { applyStyleToRange } from '../src/rich-text';

  const code = 'const x = 42;';
  const richText = new RichText({
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    text: code,
    style: { fontSize: 16, fontFamily: 'Courier New' },
  });

  let doc = richText.getDocument();

  // Color "const" (keyword) - characters 0-5
  doc = applyStyleToRange(doc, 0, 5, { color: '#0000FF', fontWeight: 'bold' });

  // Color "x" (variable) - character 6
  doc = applyStyleToRange(doc, 6, 7, { color: '#000000' });

  // Color "=" (operator) - character 8
  doc = applyStyleToRange(doc, 8, 9, { color: '#666666' });

  // Color "42" (number) - characters 10-12
  doc = applyStyleToRange(doc, 10, 12, { color: '#FF0000' });

  richText.setDocument(doc);
  return richText;
}
