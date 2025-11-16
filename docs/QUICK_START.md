# Quick Start Guide

## Installation

```bash
npm install
npm run dev
```

## Basic Usage

### 1. Create a Text Box

```typescript
import { RichTextNode, createDocument } from './rich-text';

const textNode = new RichTextNode({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  document: createDocument('Hello World'),
  draggable: true,
});

layer.add(textNode);
```

### 2. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+C` | Copy (preserves styles) |
| `Ctrl+X` | Cut (preserves styles) |
| `Ctrl+V` | Paste (restores styles if from this editor) |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+A` | Select All |
| `Escape` | Stop Editing |

### 3. List Editing

| Action | Result |
|--------|--------|
| Click "• List" button | Toggle bullet list |
| Click "1. List" button | Toggle numbered list |
| `Enter` | New list item |
| `Enter` on empty item | Exit list |
| `Tab` | Indent list item |
| `Shift+Tab` | Outdent list item |
| `Backspace` at start | Outdent or remove bullet |
| Double-click bullet | Exit list for that line |

### 4. Mouse Interactions

- **Single click in text** - Place caret
- **Single click on bullet** - Place caret at line start
- **Double-click on word** - Select word
- **Double-click on bullet** - Exit list for that line
- **Click and drag** - Select text range
- **Shift+click** - Extend selection

## Common Tasks

### Apply Style to Selection

```typescript
textNode.applyStyle({
  fontSize: 24,
  color: '#FF0000',
  fontWeight: 'bold',
  fontStyle: 'italic',
});
```

### Highlight Text

```typescript
// Add highlight
textNode.applyStyle({ backgroundColor: '#FFFF00' }); // Yellow highlight

// Remove highlight
textNode.applyStyle({ backgroundColor: undefined });
```

### Copy/Paste with Style Preservation

The editor supports rich text copy/paste:

**Internal Copy/Paste:**
- Copy text with `Ctrl+C` - preserves all formatting (bold, italic, colors, fonts)
- Paste with `Ctrl+V` - restores original styles
- Cut with `Ctrl+X` - copies with styles and removes selection

**External Paste:**
- Pasting from other sources (web, Word, etc.) inserts as plain text
- Uses current style settings for inserted text

**How it works:**
- Rich text data is embedded in clipboard as custom HTML attribute
- When pasting, editor checks for this data first
- Falls back to plain text if no rich data found

### Set Text Alignment

```typescript
textNode.setAlign('center'); // 'left' | 'center' | 'right' | 'justify'
```

### Get/Set Content

```typescript
// Plain text
const text = textNode.getText();
textNode.setText('New content');

// Rich document
const doc = textNode.getDocument();
textNode.setDocument(newDoc);
```

### Toggle Lists

```typescript
textNode.toggleBulletList();   // • Item
textNode.toggleNumberedList(); // 1. Item
```

### Listen to Events

```typescript
textNode.on('editstart', () => console.log('Started editing'));
textNode.on('editend', () => console.log('Stopped editing'));
```

## Styling Options

```typescript
interface TextStyle {
  fontFamily: string;        // 'Arial', 'Times New Roman', etc.
  fontSize: number;          // 12, 16, 24, etc.
  fontWeight: 'normal' | 'bold' | number;
  fontStyle: 'normal' | 'italic';
  color: string;             // '#000000', 'rgb(0,0,0)', etc.
  underline: boolean;
  strikethrough: boolean;
  letterSpacing: number;     // Extra spacing between chars
  lineHeight: number;        // Multiplier (1.4 = 140%)
  backgroundColor?: string;  // Highlight color
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  stroke?: {
    color: string;
    width: number;
  };
}
```

## List Nesting Visual Guide

```
● Level 0 (filled circle)
  ○ Level 1 (empty circle)
    ■ Level 2 (filled square)
      ● Level 3 (cycles back)

1. Level 0 (Arabic numerals)
  a. Level 1 (lowercase letters)
    i. Level 2 (Roman numerals)
      1. Level 3 (cycles back)
```

## Tips

1. **Performance**: The editor caches character measurements for fast rendering
2. **Undo/Redo**: History is maintained automatically (max 100 entries)
3. **Resize**: Use Konva Transformer for interactive resizing
4. **Single Edit Mode**: Only one text box can be edited at a time

## Troubleshooting

**Cursor not showing after Enter?**
- Fixed in latest version - caret now appears immediately on new line

**Text not clickable?**
- Ensure `listening: true` on hit area (default behavior)

**Styles not applying?**
- If no selection, styles apply to entire text
- If selection exists, styles apply only to selected range

## Next Steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation
- Check `src/test/*.test.ts` for usage examples
- Review `src/App.tsx` for complete integration example
