# Rich Text Editor for Konva.js - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Core Components](#core-components)
5. [Layout Engine](#layout-engine)
6. [Rendering Pipeline](#rendering-pipeline)
7. [List Behavior](#list-behavior)
8. [Event Handling](#event-handling)
9. [API Reference](#api-reference)
10. [Usage Examples](#usage-examples)

---

## Overview

A fully custom Rich Text Editor built on Konva.js canvas, inspired by Canva's text editor. This implementation provides:

- **Pure Canvas Rendering** - No HTML overlays, no contenteditable, no hidden inputs
- **Per-Character Styling** - Independent styles for each character
- **Custom Layout Engine** - Text reflow, alignment, and wrapping
- **Ordered/Unordered Lists** - With nesting and auto-numbering
- **Full Editing Support** - Caret, selection, undo/redo
- **Konva Integration** - Works with Transformer for resize

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │   Toolbar   │  │    Stage    │  │    Transformer   │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      RichTextNode                           │
│  (Konva.Group - Main Interactive Component)                 │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐   │
│  │ Hit Area │  │  Border  │  │     Text Image         │   │
│  │  (Rect)  │  │  (Rect)  │  │  (Offscreen Canvas)    │   │
│  └──────────┘  └──────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Modules                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Types     │  │   Document   │  │    Layout    │     │
│  │  (types.ts)  │  │    Model     │  │    Engine    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                            │                 │
│                                            ▼                 │
│                                    ┌──────────────┐         │
│                                    │   Renderer   │         │
│                                    │  (Canvas 2D) │         │
│                                    └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (Keyboard/Mouse)
         │
         ▼
┌──────────────────┐
│   RichTextNode   │ ◄── Event Handlers
│   (Controller)   │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Document Model  │ ◄── Immutable Operations
│  (Source of Truth)│
└──────────────────┘
         │
         ▼
┌──────────────────┐
│   Layout Engine  │ ◄── Tokenize → Wrap → Position
└──────────────────┘
         │
         ▼
┌──────────────────┐
│    Renderer      │ ◄── Offscreen Canvas
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Konva.Image     │ ◄── Display to User
└──────────────────┘
```

---

## Data Models

### Core Types

```typescript
// Document Structure
RichTextDocument {
  spans: TextSpan[]           // Text runs with styles
  align: TextAlign            // left | center | right | justify
  verticalAlign: VerticalAlign // top | middle | bottom
  padding: number             // Internal padding
  listItems: Map<number, ListItem>  // Line → List metadata
}

// Text Span (contiguous styled text)
TextSpan {
  id: string                  // Unique identifier
  text: string                // Raw text content
  style: TextStyle            // Visual properties
}

// List Item
ListItem {
  type: 'none' | 'bullet' | 'number'
  level: number               // 0 = top-level, 1+ = nested
  index: number               // For numbered lists
}

// Selection
Selection {
  anchor: number              // Start position
  focus: number               // End position (caret)
}
```

### Document Model Diagram

```
RichTextDocument
├── spans[]
│   ├── Span 0: "Hello " (bold)
│   ├── Span 1: "World" (italic)
│   └── Span 2: "!\n" (normal)
├── align: "left"
├── verticalAlign: "top"
├── padding: 8
└── listItems (Map)
    ├── 0 → { type: "bullet", level: 0, index: 0 }
    ├── 1 → { type: "bullet", level: 1, index: 0 }
    └── 2 → { type: "bullet", level: 0, index: 0 }

Rendered:
┌────────────────────────────┐
│ • Hello World!             │  ← Line 0 (level 0)
│   ○ Nested item            │  ← Line 1 (level 1)
│ • Back to top level        │  ← Line 2 (level 0)
└────────────────────────────┘
```

### Character Positioning

```
Absolute Index:  0   1   2   3   4   5   6   7   8   9   10  11
Text Content:    H   e   l   l   o       W   o   r   l   d   \n
Span Index:      [--------Span 0--------] [----Span 1----] [S2]
Position Type:   Character positions       Newline (line break marker)

Layout Result:
Line 0: chars[0-10] = "Hello World"
Line 1: chars[] = empty (after newline)
```

---

## Core Components

### 1. Types (`types.ts`)

Defines all TypeScript interfaces and type aliases. Key exports:

- `TextStyle` - Font, color, decorations
- `RichTextDocument` - Complete document state
- `LayoutResult` - Computed positions and metrics
- `createDocument()` / `createEmptyDocument()` - Factory functions

### 2. Document Model (`document-model.ts`)

Immutable operations on document state:

```typescript
// Text Operations
insertText(doc, position, text, style?) → newDoc
deleteRange(doc, start, end) → newDoc
replaceSelection(doc, selection, text, style?) → { doc, newPosition }

// Style Operations
applyStyleToRange(doc, start, end, style) → newDoc
toggleBoldInRange(doc, start, end) → newDoc
toggleItalicInRange(doc, start, end) → newDoc

// List Operations
toggleListForLines(doc, startLine, endLine, type) → newDoc
indentListItem(doc, lineIndex) → newDoc
outdentListItem(doc, lineIndex) → newDoc
renumberLists(doc) → newDoc

// Position Utilities
absoluteToSpanPosition(doc, pos) → { spanIndex, charOffset }
getLineIndexForPosition(doc, pos) → lineIndex
getLineStartPosition(doc, lineIndex) → absolutePos
isLineEmpty(doc, lineIndex) → boolean
```

### 3. Layout Engine (`layout-engine.ts`)

Computes character positions for rendering:

```
Input: RichTextDocument + Container Size
                    │
                    ▼
            ┌───────────────┐
            │   Tokenize    │  Split into words/spaces/newlines
            └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Measure Chars │  Calculate widths with cache
            └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │   Line Wrap   │  Break into lines (respect list indent)
            └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │    Align      │  Apply horizontal alignment
            └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Vertical Pos  │  Calculate Y positions + baseline
            └───────────────┘
                    │
                    ▼
Output: LayoutResult { lines[], chars[], width, height }
```

### 4. Renderer (`renderer.ts`)

Draws to offscreen canvas:

```
┌────────────────────────────────────┐
│         Offscreen Canvas           │
│  1. Clear background               │
│  2. Draw selection highlights      │
│  3. Draw list markers (●, 1., etc) │
│  4. Draw characters with styles    │
│  5. Draw text decorations          │
│  6. Draw caret if editing          │
└────────────────────────────────────┘
```

### 5. RichTextNode (`RichTextNode.ts`)

Main Konva component orchestrating everything:

- Extends `Konva.Group`
- Manages editing state
- Handles all user input
- Maintains undo/redo history
- Coordinates layout and rendering

---

## Layout Engine

### Tokenization

```
Input: "Hello World\nNew line"
         │
         ▼
Tokens: [
  { type: "word",      chars: [H,e,l,l,o], width: 50 },
  { type: "whitespace", chars: [ ],        width: 5  },
  { type: "word",      chars: [W,o,r,l,d], width: 55 },
  { type: "newline",   chars: [\n],        width: 0  },
  { type: "word",      chars: [N,e,w],     width: 35 },
  { type: "whitespace", chars: [ ],        width: 5  },
  { type: "word",      chars: [l,i,n,e],   width: 40 },
]
```

### Line Breaking Algorithm

```
availableWidth = containerWidth - padding*2 - listIndent

for each token:
  if token.type == "newline":
    finalizeLine()
    sourceLineIndex++

  else if currentLineWidth + token.width <= availableWidth:
    addToCurrentLine(token)

  else:
    // Need to wrap
    if token.type == "whitespace":
      finalizeLine()  // Don't start line with space
    else:
      finalizeLine()
      startNewLineWithToken(token)
```

### List Indentation

```
Level 0: │ • Text         (24px indent)
Level 1: │   ○ Nested     (24 + 20 = 44px indent)
Level 2: │     ■ Deeper   (24 + 40 = 64px indent)

getListIndent(listItem) = 24 + (level * 20)
```

### Caret Position Calculation

```
getCaretPosition(layout, absoluteIndex, doc):

  Case 1: Empty document
    → Return default position at padding

  Case 2: Index 0
    → Return first character's x,y

  Case 3: After regular character
    → Return previous char's x + width, y

  Case 4: After newline character (\n)
    → Count newlines to find target line
    → Return padding + listIndent, line.y
```

---

## Rendering Pipeline

### Character Rendering

```typescript
for each positionedChar:
  1. Set font (family, size, weight, style)
  2. Draw background color (if any)
  3. Apply shadow (if any)
  4. Draw stroke (if any)
  5. Draw fill text
  6. Draw underline (if enabled)
  7. Draw strikethrough (if enabled)
```

### List Marker Rendering

```
Bullet Lists (by nesting level):
  Level 0: ● (filled circle)
  Level 1: ○ (empty circle)
  Level 2: ■ (filled square)
  (cycles back to level 0 for deeper nesting)

Numbered Lists (by nesting level):
  Level 0: 1. 2. 3.    (Arabic numerals)
  Level 1: a. b. c.    (lowercase letters)
  Level 2: i. ii. iii. (Roman numerals)
```

### Selection Highlight

```
for each selected character:
  group by line
  calculate bounding box (minX, maxX, y, height)
  draw semi-transparent rectangle
```

---

## List Behavior

### State Diagram - Enter Key

```
                    ┌─────────────────┐
                    │   Press Enter   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  In list item?  │
                    └────────┬────────┘
                       Yes   │   No
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐     ┌─────▼─────┐
              │ Item empty?│     │ Split text │
              └─────┬─────┘     │ into 2     │
                Yes │  No       │ paragraphs │
              ┌─────┴─────┐     └───────────┘
              │           │
        ┌─────▼─────┐  ┌──▼────────────┐
        │ Exit list │  │ At line start?│
        │ (remove   │  └───────┬───────┘
        │ formatting)│      Yes │  No
        └───────────┘     ┌────┴────┐
                          │         │
                    ┌─────▼───┐ ┌───▼────────┐
                    │ Create  │ │ Split into │
                    │ empty   │ │ two list   │
                    │ item    │ │ items      │
                    │ ABOVE   │ └────────────┘
                    └─────────┘
```

### State Diagram - Backspace Key

```
                    ┌─────────────────┐
                    │ Press Backspace │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Has selection? │
                    └────────┬────────┘
                       Yes   │   No
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐     ┌─────▼──────────┐
              │  Delete   │     │ At line start? │
              │ selection │     └────────┬───────┘
              └───────────┘        Yes   │   No
                              ┌──────────┴──────────┐
                              │                     │
                        ┌─────▼─────┐         ┌────▼─────┐
                        │ In list   │         │ Delete   │
                        │ item?     │         │ prev char│
                        └─────┬─────┘         └──────────┘
                         Yes  │  No
                        ┌─────┴────────┐
                        │              │
                  ┌─────▼─────┐  ┌─────▼─────┐
                  │ Level > 0?│  │  Delete   │
                  └─────┬─────┘  │  newline  │
                   Yes  │  No    │  (merge)  │
                  ┌─────┴─────┐  └───────────┘
                  │           │
            ┌─────▼───┐ ┌─────▼─────┐
            │ Outdent │ │  Remove   │
            │ (level--)│ │  list    │
            └─────────┘ │formatting │
                        └───────────┘
```

### Double-Click in Bullet Zone

```
┌──────────────────────────────┐
│ • Item 1                     │  ◄── Double-click on bullet
│ • Item 2                     │
│ • Item 3                     │
└──────────────────────────────┘
                │
                ▼
┌──────────────────────────────┐
│ Item 1                       │  ◄── No longer a list item
│ • Item 2                     │      (numbering adjusted)
│ • Item 3                     │
└──────────────────────────────┘
```

### Auto-Renumbering

```
Before deletion:              After deletion:
┌────────────────┐           ┌────────────────┐
│ 1. First item  │           │ 1. First item  │
│ 2. Second item │  ──────►  │ 2. Third item  │  (auto-renumbered)
│ 3. Third item  │  (delete) │ 3. Fourth item │
│ 4. Fourth item │           └────────────────┘
└────────────────┘

Nested renumbering:
┌─────────────────┐
│ 1. Parent       │
│   a. Child 1    │  ◄── Level 1 numbering
│   b. Child 2    │
│ 2. Parent       │  ◄── Level 0 continues
│   a. Child 1    │  ◄── Level 1 resets
└─────────────────┘
```

---

## Event Handling

### Keyboard Events

```
┌─────────────────────────────────────────────────┐
│                  Key Handler                    │
├─────────────────────────────────────────────────┤
│ Ctrl+B        │ Toggle bold                     │
│ Ctrl+I        │ Toggle italic                   │
│ Ctrl+U        │ Toggle underline                │
│ Ctrl+Z        │ Undo                            │
│ Ctrl+Y        │ Redo                            │
│ Ctrl+A        │ Select all                      │
│ Ctrl+C        │ Copy                            │
│ Ctrl+X        │ Cut                             │
│ Ctrl+V        │ Paste                           │
│ Backspace     │ Delete backward                 │
│ Delete        │ Delete forward                  │
│ Enter         │ New line / List behavior        │
│ Tab           │ Indent list / Insert tab        │
│ Shift+Tab     │ Outdent list                    │
│ Arrow keys    │ Move caret                      │
│ Shift+Arrows  │ Extend selection                │
│ Home          │ Go to line start                │
│ End           │ Go to line end                  │
│ Escape        │ Stop editing                    │
└─────────────────────────────────────────────────┘
```

### Mouse Events

```
┌─────────────────────────────────────────────────┐
│                 Mouse Handler                   │
├─────────────────────────────────────────────────┤
│ Click in text     │ Place caret at position    │
│ Click in bullet   │ Place caret at line start  │
│ Double-click text │ Select word                 │
│ Double-click bullet│ Exit list for that line   │
│ Click+Drag        │ Select range               │
│ Shift+Click       │ Extend selection           │
└─────────────────────────────────────────────────┘
```

---

## API Reference

### RichTextNode Constructor

```typescript
const textNode = new RichTextNode({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  document: createDocument('Initial text'),
  placeholder: 'Type here...',
  editable: true,
  draggable: true,
});
```

### Public Methods

```typescript
// Editing Control
startEditing(): void
stopEditing(): void
isEditing(): boolean

// Text Content
getText(): string
setText(text: string): void
getDocument(): RichTextDocument
setDocument(doc: RichTextDocument): void

// Selection
selectAll(): void
getSelection(): Selection

// Styling
applyStyle(style: Partial<TextStyle>): void
toggleBold(): void
toggleItalic(): void
toggleUnderline(): void

// Lists
toggleBulletList(): void
toggleNumberedList(): void

// Alignment
setAlign(align: 'left' | 'center' | 'right' | 'justify'): void

// History
undo(): void
redo(): void

// Dimensions
getBoxSize(): { width: number; height: number }
setBoxSize(width: number, height: number): void

// Lifecycle
destroy(): this
```

### Events

```typescript
textNode.on('editstart', () => {
  // Editing mode started
});

textNode.on('editend', () => {
  // Editing mode ended
});
```

---

## Usage Examples

### Basic Setup

```typescript
import Konva from 'konva';
import { RichTextNode, createDocument } from './rich-text';

const stage = new Konva.Stage({
  container: 'container',
  width: 800,
  height: 600,
});

const layer = new Konva.Layer();
stage.add(layer);

const textNode = new RichTextNode({
  x: 50,
  y: 50,
  width: 300,
  height: 200,
  document: createDocument('Hello World'),
  draggable: true,
});

layer.add(textNode);

// Add transformer for resizing
const transformer = new Konva.Transformer({
  nodes: [textNode],
});
layer.add(transformer);

layer.draw();
```

### Applying Styles

```typescript
// Apply to selection or entire text
textNode.applyStyle({
  fontSize: 24,
  color: '#FF0000',
  fontWeight: 'bold',
});

// Toggle specific styles
textNode.toggleBold();
textNode.toggleItalic();
textNode.toggleUnderline();

// Set alignment
textNode.setAlign('center');
```

### Working with Lists

```typescript
// Create bullet list
textNode.toggleBulletList();

// Create numbered list
textNode.toggleNumberedList();

// Keyboard shortcuts in list:
// - Enter: New list item
// - Enter (empty item): Exit list
// - Tab: Indent
// - Shift+Tab: Outdent
// - Backspace at start: Outdent or exit list
```

### Custom Document

```typescript
const doc: RichTextDocument = {
  spans: [
    {
      id: 'span1',
      text: 'Bold text ',
      style: { ...DEFAULT_STYLE, fontWeight: 'bold' },
    },
    {
      id: 'span2',
      text: 'and italic',
      style: { ...DEFAULT_STYLE, fontStyle: 'italic' },
    },
  ],
  align: 'left',
  verticalAlign: 'top',
  padding: 8,
  listItems: new Map(),
};

textNode.setDocument(doc);
```

### Integrating with React

```tsx
function App() {
  const layerRef = useRef<Konva.Layer>(null);
  const textNodesRef = useRef<RichTextNode[]>([]);

  const addTextBox = () => {
    const node = new RichTextNode({
      x: 100,
      y: 100,
      width: 300,
      height: 150,
      document: createDocument('New text'),
      draggable: true,
    });

    textNodesRef.current.push(node);
    layerRef.current?.add(node);
    layerRef.current?.batchDraw();
  };

  return (
    <div>
      <button onClick={addTextBox}>Add Text</button>
      <Stage width={800} height={600}>
        <Layer ref={layerRef} />
      </Stage>
    </div>
  );
}
```

---

## Performance Considerations

1. **Measurement Caching** - Character widths are cached to avoid repeated canvas measurements
2. **Offscreen Rendering** - Text is rendered to offscreen canvas, then blitted to Konva
3. **Batch Updates** - Multiple changes are batched before re-rendering
4. **Device Pixel Ratio** - High-DPI displays supported with proper scaling

---

## Future Enhancements

- [ ] Rich paste (preserve formatting from clipboard)
- [ ] Find and replace
- [ ] Spell checking
- [ ] Collaborative editing (OT/CRDT)
- [ ] Custom fonts loading
- [ ] Tables support
- [ ] Image embedding
- [ ] Hyperlinks
- [ ] Text effects (gradients, outlines)
- [ ] Auto-save/recovery

---

## File Structure

```
src/
├── rich-text/
│   ├── types.ts           # All TypeScript interfaces
│   ├── document-model.ts  # Immutable document operations
│   ├── layout-engine.ts   # Text positioning and wrapping
│   ├── renderer.ts        # Canvas 2D rendering
│   ├── RichTextNode.ts    # Main Konva component
│   └── index.ts           # Module exports
├── test/
│   ├── document-model.test.ts
│   ├── layout-engine.test.ts
│   └── edge-cases.test.ts
└── App.tsx                # Demo application
```

---

## Contributing

1. All document operations must be immutable
2. Layout engine must handle edge cases (empty docs, long words, etc.)
3. Tests required for new features
4. TypeScript strict mode enforced
5. Follow existing code patterns

---

## License

MIT License - See LICENSE file for details.
