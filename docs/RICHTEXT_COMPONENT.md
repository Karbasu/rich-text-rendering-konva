# RichText Component

The `RichText` component is a reusable, feature-rich text component for Konva.js that provides a clean API similar to native Konva components.

## Features

- ✅ Standard Konva properties (x, y, width, height, scaleX, scaleY, rotation, etc.)
- ✅ Full rich text editing capabilities
- ✅ Transformation support (scale, rotate, skew)
- ✅ Per-character styling
- ✅ List support (bullets and numbered)
- ✅ Undo/Redo functionality
- ✅ Copy/paste with style preservation
- ✅ JSON serialization/deserialization
- ✅ Event forwarding (editstart, editend, textchange)

## Installation

```typescript
import { RichText } from './components';
```

## Basic Usage

### Creating a Simple Text Box

```typescript
import Konva from 'konva';
import { RichText } from './components';

const layer = new Konva.Layer();

// Create a simple text box
const richText = new RichText({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  text: 'Hello World!',
  draggable: true,
});

layer.add(richText);
```

### With Custom Styling

```typescript
const richText = new RichText({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  text: 'Styled Text',
  style: {
    fontSize: 24,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    color: '#FF0000',
    lineHeight: 1.5,
    letterSpacing: 2,
  },
  align: 'center',
  draggable: true,
});
```

### With Initial Document

```typescript
import { createDocument } from './components';

const document = createDocument('My custom text', {
  fontSize: 18,
  color: '#333333',
});

const richText = new RichText({
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  document,
  draggable: true,
});
```

## Configuration Options

```typescript
interface RichTextConfig {
  // Position
  x?: number;
  y?: number;

  // Size (required)
  width: number;
  height: number;

  // Transformations
  scaleX?: number;
  scaleY?: number;
  rotation?: number;

  // Content
  text?: string;
  document?: RichTextDocument;
  style?: Partial<TextStyle>;

  // Settings
  placeholder?: string;
  editable?: boolean;
  draggable?: boolean;

  // Alignment
  align?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  padding?: number;
}
```

## API Reference

### Dimension Methods

```typescript
// Get/Set width
richText.getWidth(): number
richText.setWidth(width: number): RichText

// Get/Set height
richText.getHeight(): number
richText.setHeight(height: number): RichText

// Set both at once
richText.setSize(width: number, height: number): RichText

// Get bounding box (with transformations)
richText.getBoundingBox(): { x, y, width, height }
```

### Text Content Methods

```typescript
// Get/Set plain text
richText.getText(): string
richText.setText(text: string): RichText

// Get/Set rich document
richText.getDocument(): RichTextDocument
richText.setDocument(doc: RichTextDocument): RichText
```

### Editing Methods

```typescript
// Control editing mode
richText.startEditing(): RichText
richText.stopEditing(): RichText
richText.isEditing(): boolean
```

### Styling Methods

```typescript
// Apply styles to selection or all text
richText.applyStyle({
  fontSize: 24,
  color: '#FF0000',
  fontWeight: 'bold',
}): RichText

// Toggle specific styles
richText.toggleBold(): RichText
richText.toggleItalic(): RichText
richText.toggleUnderline(): RichText
richText.toggleStrikethrough(): RichText
```

### Alignment Methods

```typescript
// Horizontal alignment
richText.setAlign('left' | 'center' | 'right' | 'justify'): RichText
richText.getAlign(): 'left' | 'center' | 'right' | 'justify'

// Vertical alignment
richText.setVerticalAlign('top' | 'middle' | 'bottom'): RichText
richText.getVerticalAlign(): 'top' | 'middle' | 'bottom'
```

### List Methods

```typescript
// Toggle list types
richText.toggleBulletList(): RichText
richText.toggleNumberedList(): RichText
```

### Selection Methods

```typescript
// Select all text
richText.selectAll(): RichText
```

### History Methods

```typescript
// Undo/Redo
richText.undo(): RichText
richText.redo(): RichText
```

### Transformation Methods

```typescript
// Uniform scaling
richText.scaleUniform(scale: number): RichText

// Rotation
richText.rotateDeg(degrees: number): RichText
richText.rotateRad(radians: number): RichText

// Reset transformations
richText.resetTransform(): RichText

// Standard Konva methods also work:
richText.x(100)
richText.y(50)
richText.scaleX(1.5)
richText.scaleY(1.5)
richText.rotation(45)
```

### Utility Methods

```typescript
// Clone
const copy = richText.clone(): RichText

// Destroy
richText.destroy(): void

// Serialization
const json = richText.toJSON(): Record<string, unknown>
const restored = RichText.fromJSON(json): RichText
```

## Events

The RichText component forwards events from the internal RichTextNode:

```typescript
// Editing events
richText.on('editstart', () => {
  console.log('Started editing');
});

richText.on('editend', () => {
  console.log('Stopped editing');
});

richText.on('textchange', () => {
  console.log('Text changed');
});

// Standard Konva events
richText.on('click', () => { ... });
richText.on('dragstart', () => { ... });
richText.on('dragend', () => { ... });
```

## Advanced Examples

### Example 1: Interactive Text with Transformer

```typescript
const layer = new Konva.Layer();
const transformer = new Konva.Transformer();
layer.add(transformer);

const richText = new RichText({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  text: 'Editable and transformable text',
  draggable: true,
});

layer.add(richText);

// Select on click
richText.on('click', () => {
  transformer.nodes([richText]);
});

// Hide transformer while editing
richText.on('editstart', () => {
  transformer.nodes([]);
});

richText.on('editend', () => {
  transformer.nodes([richText]);
});
```

### Example 2: Styled Text with Multiple Formats

```typescript
import { createDocument } from './components';

// Create document with pre-styled sections
const doc = {
  spans: [
    { id: '1', text: 'Bold text', style: { fontWeight: 'bold', fontSize: 20 } },
    { id: '2', text: ' normal text ', style: { fontSize: 16 } },
    { id: '3', text: 'red italic', style: { color: '#FF0000', fontStyle: 'italic', fontSize: 16 } },
  ],
  align: 'left',
  verticalAlign: 'top',
  padding: 10,
  listItems: new Map(),
};

const richText = new RichText({
  x: 50,
  y: 50,
  width: 400,
  height: 200,
  document: doc,
  draggable: true,
});
```

### Example 3: Programmatic Text Manipulation

```typescript
const richText = new RichText({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  text: 'Initial text',
  draggable: true,
});

// Change text programmatically
setTimeout(() => {
  richText.setText('Updated text after 2 seconds');
}, 2000);

// Apply bold to all text
setTimeout(() => {
  richText.selectAll();
  richText.toggleBold();
}, 4000);

// Change font size
setTimeout(() => {
  richText.applyStyle({ fontSize: 32 });
}, 6000);
```

### Example 4: Rotated and Scaled Text

```typescript
const richText = new RichText({
  x: 300,
  y: 200,
  width: 200,
  height: 150,
  text: 'Transformed Text',
  style: { fontSize: 24, fontWeight: 'bold' },
  scaleX: 1.5,
  scaleY: 1.5,
  rotation: 45, // degrees
  draggable: true,
});

// Or transform after creation
richText.rotateDeg(45);
richText.scaleUniform(1.5);
```

### Example 5: Serialization/Deserialization

```typescript
// Create text box
const richText = new RichText({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  text: 'Save me!',
  style: { fontSize: 18, color: '#FF0000' },
  rotation: 30,
});

// Serialize to JSON
const json = richText.toJSON();
localStorage.setItem('myText', JSON.stringify(json));

// Later, restore from JSON
const savedJson = JSON.parse(localStorage.getItem('myText'));
const restored = RichText.fromJSON(savedJson);
layer.add(restored);
```

### Example 6: Multiple Text Boxes with Toolbar

```typescript
const textBoxes: RichText[] = [];

function createTextBox() {
  const richText = new RichText({
    x: 100 + textBoxes.length * 50,
    y: 100 + textBoxes.length * 50,
    width: 300,
    height: 200,
    text: `Text Box ${textBoxes.length + 1}`,
    draggable: true,
  });

  layer.add(richText);
  textBoxes.push(richText);

  richText.on('click', () => {
    setActiveTextBox(richText);
  });

  return richText;
}

// Toolbar actions
function makeBold() {
  activeTextBox?.toggleBold();
}

function changeColor(color: string) {
  activeTextBox?.applyStyle({ color });
}
```

## Style Options

The `style` parameter supports all these properties:

```typescript
interface TextStyle {
  fontFamily: string;           // e.g., 'Arial', 'Times New Roman'
  fontSize: number;              // in pixels
  fontWeight: 'normal' | 'bold' | number; // 100-900
  fontStyle: 'normal' | 'italic';
  color: string;                 // hex or rgb
  backgroundColor?: string;      // highlight color
  underline: boolean;
  strikethrough: boolean;
  letterSpacing: number;         // in pixels
  lineHeight: number;            // multiplier (e.g., 1.5)
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}
```

## Keyboard Shortcuts

When editing is active:

- **Ctrl+B** - Toggle bold
- **Ctrl+I** - Toggle italic
- **Ctrl+U** - Toggle underline
- **Ctrl+C** - Copy with styles
- **Ctrl+X** - Cut with styles
- **Ctrl+V** - Paste with styles
- **Ctrl+Z** - Undo
- **Ctrl+Y** - Redo
- **Ctrl+A** - Select all
- **Tab** - Indent list (if in list)
- **Shift+Tab** - Outdent list
- **Enter** - New line / new list item
- **Escape** - Stop editing

## Best Practices

### 1. Memory Management

Always destroy text boxes when removing them:

```typescript
richText.destroy();
```

### 2. Event Handling

Prevent multiple text boxes from editing simultaneously:

```typescript
richText.on('editstart', () => {
  // Stop editing on all other text boxes
  textBoxes.forEach(tb => {
    if (tb !== richText) {
      tb.stopEditing();
    }
  });
});
```

### 3. Transformer Integration

Hide transformer handles while editing for better UX:

```typescript
richText.on('editstart', () => {
  transformer.nodes([]);
});

richText.on('editend', () => {
  transformer.nodes([richText]);
});
```

### 4. Performance

For many text boxes, consider:
- Using smaller canvas sizes
- Limiting the number of active text boxes
- Destroying off-screen text boxes

## Migration from RichTextNode

If you're upgrading from `RichTextNode`:

```typescript
// Old way
import { RichTextNode, createDocument } from './rich-text';

const doc = createDocument('text', { fontSize: 18 });
const textNode = new RichTextNode({
  x: 100, y: 100,
  width: 300, height: 200,
  document: doc,
  draggable: true
});

// New way (much simpler!)
import { RichText } from './components';

const richText = new RichText({
  x: 100, y: 100,
  width: 300, height: 200,
  text: 'text',
  style: { fontSize: 18 },
  draggable: true
});
```

The new `RichText` component provides:
- Cleaner API with `text` and `style` parameters
- All standard Konva transformation methods
- Better TypeScript support
- Easier serialization

## Troubleshooting

### Text not appearing
- Check that `width` and `height` are set
- Verify the text color isn't the same as background
- Ensure the text is within the visible canvas area

### Editing not working
- Make sure `editable` is not set to `false`
- Check that the text box is on a visible layer
- Verify click events aren't being blocked

### Transformations not applying
- Use the Konva Transformer for visual handles
- Remember to call `layer.batchDraw()` after changes
- Check scale values aren't set to 0

### Performance issues
- Limit the number of characters per text box
- Use smaller canvas dimensions when possible
- Destroy unused text boxes

## License

Same as the main project.
