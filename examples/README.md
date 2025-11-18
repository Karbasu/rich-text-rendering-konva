# Character-Level Editing Examples

This folder contains examples demonstrating the **character-level editing** capabilities of the RichText component.

## What is Character-Level Editing?

Character-level editing means you can apply **different styles to individual characters** within the same text. Each character can have:

- Different font size
- Different color
- Different font weight (bold/normal)
- Different font style (italic/normal)
- Different background color (highlight)
- Different decorations (underline, strikethrough)
- Different letter spacing
- Different stroke/shadow effects

## Files

### `character-level-editing.ts`
Contains 10 standalone examples showing various character-level editing techniques:

1. **Style Specific Characters** - Apply bold, color, italic to specific character ranges
2. **Rainbow Text** - Each character has a different color
3. **Mixed Styles Within a Word** - Different styles within a single word
4. **Variable Character Sizes** - Progressively larger font sizes
5. **Alternating Styles** - Alternate between bold and italic
6. **Highlight Characters** - Find and highlight specific characters (e.g., vowels)
7. **Character Animation Setup** - Animate individual characters
8. **Custom Styled Document** - Completely unique styling per character
9. **Interactive Character Styling** - User selection and styling
10. **Syntax Highlighting** - Code syntax highlighting character by character

### `CharacterLevelDemo.tsx`
A visual React demo showing 6 live examples of character-level editing.

## How It Works

The RichText component uses the `applyStyleToRange` function to style specific character ranges:

```typescript
import { RichText } from '../src/components';
import { applyStyleToRange } from '../src/rich-text';

// Create text
const richText = new RichText({
  x: 100, y: 100,
  width: 400, height: 200,
  text: 'Hello World',
  style: { fontSize: 24 }
});

// Get the document
let doc = richText.getDocument();

// Style characters 0-5 ("Hello") in red and bold
doc = applyStyleToRange(doc, 0, 5, {
  color: '#FF0000',
  fontWeight: 'bold'
});

// Style characters 6-11 ("World") in blue and italic
doc = applyStyleToRange(doc, 6, 11, {
  color: '#0000FF',
  fontStyle: 'italic'
});

// Apply the styled document back
richText.setDocument(doc);
```

## Character Indices

Character indices are **zero-based** and count from the start of the text:

```
Text:    H  e  l  l  o     W  o  r  l  d
Index:   0  1  2  3  4  5  6  7  8  9  10
```

- Characters 0-4: "Hello"
- Character 5: space
- Characters 6-10: "World"

## Common Use Cases

### 1. Syntax Highlighting
```typescript
const code = 'const x = 42;';
let doc = richText.getDocument();

// Keywords in blue
doc = applyStyleToRange(doc, 0, 5, { color: '#0000FF', fontWeight: 'bold' });

// Numbers in red
doc = applyStyleToRange(doc, 10, 12, { color: '#FF0000' });

richText.setDocument(doc);
```

### 2. Search and Highlight
```typescript
const text = richText.getText();
const searchTerm = 'important';
const index = text.indexOf(searchTerm);

if (index !== -1) {
  let doc = richText.getDocument();
  doc = applyStyleToRange(doc, index, index + searchTerm.length, {
    backgroundColor: '#FFFF00'
  });
  richText.setDocument(doc);
}
```

### 3. Decorative Text Effects
```typescript
let doc = richText.getDocument();
const text = richText.getText();

// Rainbow gradient
for (let i = 0; i < text.length; i++) {
  const hue = (i * 360) / text.length;
  doc = applyStyleToRange(doc, i, i + 1, {
    color: `hsl(${hue}, 100%, 50%)`
  });
}

richText.setDocument(doc);
```

### 4. Markdown-Style Formatting
```typescript
// **bold** _italic_ `code`
let doc = richText.getDocument();

// Find and style **bold** (characters 10-14)
doc = applyStyleToRange(doc, 10, 14, { fontWeight: 'bold' });

// Find and style _italic_ (characters 20-26)
doc = applyStyleToRange(doc, 20, 26, { fontStyle: 'italic' });

// Find and style `code` (characters 30-34)
doc = applyStyleToRange(doc, 30, 34, {
  fontFamily: 'Courier New',
  backgroundColor: '#F0F0F0'
});

richText.setDocument(doc);
```

## Interactive User Selection

When users select text while editing, the selection also works at character level:

```typescript
richText.on('editend', () => {
  // User has finished editing
  // Any selection they made was character-precise
  // You can then apply styles to exactly what they selected
});
```

Users can:
- Click and drag to select specific characters
- Double-click to select a word
- Use Shift+Arrow keys for character-by-character selection
- Apply formatting (Ctrl+B, Ctrl+I, etc.) to their selection

## Performance Note

Character-level styling is **efficient** because:
1. The document model groups consecutive characters with the same style into **TextSpans**
2. Only characters with different styles create new spans
3. The renderer batches characters with identical styles

Example internal optimization:
```typescript
// This text: "Hello" (all bold) + " " (normal) + "World" (all italic)
// Is stored as only 3 spans, not 11 individual characters:
{
  spans: [
    { text: "Hello", style: { fontWeight: 'bold' } },
    { text: " ", style: {} },
    { text: "World", style: { fontStyle: 'italic' } }
  ]
}
```

## Running the Examples

### TypeScript Examples
```bash
# Import and use the examples
import { example1_StyleSpecificCharacters } from './examples/character-level-editing';

const richText = example1_StyleSpecificCharacters();
layer.add(richText);
```

### React Demo
```bash
# Add to your router or render directly
import CharacterLevelDemo from './examples/CharacterLevelDemo';

<CharacterLevelDemo />
```

## API Reference

### `applyStyleToRange(doc, start, end, style)`
Apply styles to a specific character range.

**Parameters:**
- `doc`: RichTextDocument - The document to modify
- `start`: number - Starting character index (inclusive)
- `end`: number - Ending character index (exclusive)
- `style`: Partial<TextStyle> - Styles to apply

**Returns:** RichTextDocument - New document with styles applied

**Example:**
```typescript
// Style characters 5-10
doc = applyStyleToRange(doc, 5, 10, {
  fontSize: 24,
  color: '#FF0000',
  fontWeight: 'bold'
});
```

### Available Style Properties

```typescript
{
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | number;
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor: string;
  underline: boolean;
  strikethrough: boolean;
  letterSpacing: number;
  lineHeight: number;
  stroke: { color: string; width: number };
  shadow: { color: string; blur: number; offsetX: number; offsetY: number };
}
```

## Tips

1. **Always work with the document** - Get it, modify it, set it back:
   ```typescript
   let doc = richText.getDocument();
   doc = applyStyleToRange(doc, ...);
   richText.setDocument(doc);
   ```

2. **Chain multiple style operations** - You can apply styles to multiple ranges:
   ```typescript
   let doc = richText.getDocument();
   doc = applyStyleToRange(doc, 0, 5, { color: 'red' });
   doc = applyStyleToRange(doc, 6, 10, { color: 'blue' });
   doc = applyStyleToRange(doc, 11, 15, { color: 'green' });
   richText.setDocument(doc);
   ```

3. **Use text length** - Get character count with `getText().length`:
   ```typescript
   const text = richText.getText();
   // Style last 5 characters
   doc = applyStyleToRange(doc, text.length - 5, text.length, { ... });
   ```

4. **Handle newlines** - Newline characters (`\n`) also count in indices:
   ```typescript
   const text = "Line 1\nLine 2";
   // Character 6 is '\n'
   ```

## Limitations

None! Every character can have completely independent styling. The only limit is your imagination.

## Questions?

See the main documentation in `docs/RICHTEXT_COMPONENT.md` for more details about the RichText component.
