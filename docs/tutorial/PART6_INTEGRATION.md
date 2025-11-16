# Part 6: Integration & Polish

You've built all the pieces: document model, layout engine, renderer, input handling, and advanced features. Now let's wrap everything into a cohesive Konva component and polish it for production.

## Konva Node Architecture

Extend `Konva.Group` to create your rich text node:

```pseudo
class RichTextNode extends Konva.Group:
  // State
  _document: RichTextDocument
  _selection: Selection
  _layout: LayoutResult
  _currentStyle: TextStyle
  _isEditing: boolean

  // Rendering
  _offscreenCanvas: HTMLCanvasElement
  _imageNode: Konva.Image
  _hitRegion: Konva.Rect

  // History
  _history: HistoryManager

  // Config
  _config: TextBoxConfig

  constructor(config):
    super(config)

    // Initialize state
    this._document = config.document || createEmptyDocument()
    this._selection = { anchor: 0, focus: 0 }
    this._currentStyle = { ...DEFAULT_STYLE }
    this._isEditing = false

    this._history = new HistoryManager()
    this._config = config

    // Create visual elements
    this._createVisualElements()

    // Setup events
    this._setupEventHandlers()

    // Initial render
    this._updateVisual()
```

### Visual Elements

```pseudo
function _createVisualElements():
  // Hit region for click detection
  this._hitRegion = new Konva.Rect({
    x: 0,
    y: 0,
    width: this.width(),
    height: this.height(),
    fill: 'transparent',
    stroke: '#999',
    strokeWidth: 1
  })
  this.add(this._hitRegion)

  // Image node for rendered text
  this._imageNode = new Konva.Image({
    x: 0,
    y: 0,
    width: this.width(),
    height: this.height()
  })
  this.add(this._imageNode)

  // Border/background
  this._background = new Konva.Rect({
    x: 0,
    y: 0,
    width: this.width(),
    height: this.height(),
    fill: '#FFFFFF',
    stroke: '#CCCCCC',
    strokeWidth: 1
  })
  // Add background behind image
  this.add(this._background)
  this._background.moveToBottom()
```

## Event Handler Setup

```pseudo
function _setupEventHandlers():
  // Double-click to edit
  this.on('dblclick', (e) => {
    e.cancelBubble = true
    this.startEditing()

    // Position caret at click
    pos = this.getRelativePointerPosition()
    charIndex = hitTestPosition(this._layout, pos.x, pos.y, this._document)
    this._setCaretPosition(charIndex)
  })

  // Single click while editing
  this.on('click', (e) => {
    if this._isEditing:
      e.cancelBubble = true
      pos = this.getRelativePointerPosition()
      charIndex = hitTestPosition(this._layout, pos.x, pos.y, this._document)
      this._setCaretPosition(charIndex)
  })

  // Drag selection
  this.on('mousedown', (e) => {
    if this._isEditing:
      this._handleMouseDown(e)
  })

  // Resize handling
  this.on('transform', () => {
    this._handleTransform()
  })
```

### Transform Handling

When user resizes via Konva Transformer:

```pseudo
function _handleTransform():
  // Get new dimensions
  newWidth = this.width() * this.scaleX()
  newHeight = this.height() * this.scaleY()

  // Reset scale (we'll change actual dimensions)
  this.scaleX(1)
  this.scaleY(1)

  // Update node size
  this.width(newWidth)
  this.height(newHeight)

  // Update child elements
  this._hitRegion.width(newWidth)
  this._hitRegion.height(newHeight)
  this._background.width(newWidth)
  this._background.height(newHeight)
  this._imageNode.width(newWidth)
  this._imageNode.height(newHeight)

  // Re-layout with new dimensions
  this._markLayoutDirty()
  this._updateVisual()
```

## Public API

Design a clean API for external use:

```pseudo
// Editing lifecycle
startEditing(): void
stopEditing(): void
isEditing(): boolean

// Document access
getDocument(): RichTextDocument
setDocument(doc: RichTextDocument): void
getText(): string

// Styling
applyStyle(style: Partial<TextStyle>): void
toggleBold(): void
toggleItalic(): void
toggleUnderline(): void
setAlign(align: TextAlign): void

// Lists
toggleBulletList(): void
toggleNumberedList(): void

// History
undo(): void
redo(): void
canUndo(): boolean
canRedo(): boolean

// Selection
getSelection(): Selection
setSelection(selection: Selection): void
selectAll(): void
hasSelection(): boolean

// Events (Konva events)
// 'editstart' - Fired when editing begins
// 'editend' - Fired when editing ends
// 'change' - Fired when document changes
```

### Implementation Examples

```pseudo
function getText():
  return getDocumentText(this._document)

function applyStyle(styleUpdates):
  if this.hasSelection():
    { start, end } = this._getSelectionRange()
    this._saveHistoryState()
    this._document = applyStyleToRange(this._document, start, end, styleUpdates)
    this._markLayoutDirty()
    this._updateVisual()
    this.fire('change')
  else:
    this._currentStyle = { ...this._currentStyle, ...styleUpdates }

function toggleBold():
  if this.hasSelection():
    { start, end } = this._getSelectionRange()
    isBold = this._isRangeBold(start, end)
    this.applyStyle({ fontWeight: isBold ? 'normal' : 'bold' })
  else:
    this._currentStyle.fontWeight =
      this._currentStyle.fontWeight == 'bold' ? 'normal' : 'bold'
```

## Integration with Konva Transformer

```pseudo
// In your application setup
stage = new Konva.Stage({ container: 'canvas', width: 800, height: 600 })
layer = new Konva.Layer()
stage.add(layer)

transformer = new Konva.Transformer({
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'],
  boundBoxFunc: (oldBox, newBox) => {
    // Limit minimum size
    if newBox.width < 50 or newBox.height < 30:
      return oldBox
    return newBox
  }
})
layer.add(transformer)

textNode = new RichTextNode({
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  draggable: true
})
layer.add(textNode)

// Click to select
textNode.on('click', (e) => {
  e.cancelBubble = true
  transformer.nodes([textNode])
  layer.batchDraw()
})

// Hide transformer while editing
textNode.on('editstart', () => {
  transformer.nodes([])
  layer.batchDraw()
})

textNode.on('editend', () => {
  transformer.nodes([textNode])
  layer.batchDraw()
})

// Click stage to deselect
stage.on('click', (e) => {
  if e.target == stage:
    textNode.stopEditing()
    transformer.nodes([])
    layer.batchDraw()
})
```

## Memory Management

### Cleanup on Destroy

```pseudo
function destroy():
  // Stop editing
  this.stopEditing()

  // Remove event listeners
  if this._keydownHandler:
    window.removeEventListener('keydown', this._keydownHandler)
  if this._keypressHandler:
    window.removeEventListener('keypress', this._keypressHandler)
  if this._mouseMoveHandler:
    window.removeEventListener('mousemove', this._mouseMoveHandler)
  if this._mouseUpHandler:
    window.removeEventListener('mouseup', this._mouseUpHandler)

  // Clear intervals
  if this._caretBlinkInterval:
    clearInterval(this._caretBlinkInterval)
  if this._autoSaveInterval:
    clearInterval(this._autoSaveInterval)

  // Clear canvas references
  this._offscreenCanvas = null

  // Clear history
  this._history.clear()

  // Call parent destroy
  super.destroy()
```

### Avoid Memory Leaks

```pseudo
// DON'T: Create new functions on every call
this.on('click', () => {
  window.addEventListener('keydown', (e) => { ... })  // Leak!
})

// DO: Store references
this._keydownHandler = (e) => { ... }
window.addEventListener('keydown', this._keydownHandler)
// Later: window.removeEventListener('keydown', this._keydownHandler)
```

## Error Handling

```pseudo
function _updateVisual():
  try:
    this._layout = computeLayout(this._document, this.width(), this.height())
    canvas = renderRichText(this._layout, this._document, ...)
    this._imageNode.image(canvas)
    this.getLayer()?.batchDraw()
  catch (error):
    console.error('Rich text render error:', error)
    // Show error state or fallback
    this._renderErrorState()

function _renderErrorState():
  ctx = this._offscreenCanvas.getContext('2d')
  ctx.fillStyle = '#FFCCCC'
  ctx.fillRect(0, 0, this.width(), this.height())
  ctx.fillStyle = '#FF0000'
  ctx.fillText('Render Error', 10, 20)
```

## Performance Optimization

### Debounce Render Calls

```pseudo
_renderScheduled: boolean = false

function _scheduleRender():
  if this._renderScheduled:
    return

  this._renderScheduled = true
  requestAnimationFrame(() => {
    this._updateVisual()
    this._renderScheduled = false
  })

// Use _scheduleRender() instead of immediate _updateVisual()
function handleCharacterInput(char):
  // ... modify document
  this._scheduleRender()  // Batched
```

### Throttle Expensive Operations

```pseudo
function handleMouseMove(e):
  // Throttle to 60fps
  if Date.now() - this._lastMouseMoveTime < 16:
    return

  this._lastMouseMoveTime = Date.now()
  // ... handle drag selection
```

### Lazy Initialization

```pseudo
function _ensureOffscreenCanvas():
  if not this._offscreenCanvas:
    this._offscreenCanvas = document.createElement('canvas')
    // Setup...

  return this._offscreenCanvas

// Only create when needed
function _updateVisual():
  canvas = this._ensureOffscreenCanvas()
  // ...
```

## Testing Strategies

### Unit Tests

```pseudo
// Test document operations
describe('Document Model', () => {
  test('insert text', () => {
    doc = createDocument('Hello')
    doc = insertText(doc, 5, ' World')
    expect(getText(doc)).toBe('Hello World')
  })

  test('delete range', () => {
    doc = createDocument('Hello World')
    doc = deleteRange(doc, 5, 11)
    expect(getText(doc)).toBe('Hello')
  })

  test('apply style preserves text', () => {
    doc = createDocument('Test')
    doc = applyStyle(doc, 0, 4, { bold: true })
    expect(getText(doc)).toBe('Test')
  })
})

// Test layout
describe('Layout Engine', () => {
  test('single line fits', () => {
    doc = createDocument('Short')
    layout = computeLayout(doc, 200, 100)
    expect(layout.lines.length).toBe(1)
  })

  test('long text wraps', () => {
    doc = createDocument('This is a very long text that should wrap')
    layout = computeLayout(doc, 100, 200)
    expect(layout.lines.length).toBeGreaterThan(1)
  })
})
```

### Integration Tests

```pseudo
describe('RichTextNode', () => {
  test('typing inserts characters', () => {
    node = new RichTextNode({ width: 200, height: 100 })
    node.startEditing()

    simulateKeypress('H')
    simulateKeypress('i')

    expect(node.getText()).toBe('Hi')
  })

  test('backspace deletes character', () => {
    node = new RichTextNode({
      width: 200,
      height: 100,
      document: createDocument('Hello')
    })
    node.startEditing()
    node._selection = { anchor: 5, focus: 5 }

    simulateKeydown('Backspace')

    expect(node.getText()).toBe('Hell')
  })

  test('undo restores previous state', () => {
    node = new RichTextNode({ ... })
    // ... make changes
    node.undo()
    // ... verify restoration
  })
})
```

### Visual/Snapshot Testing

```pseudo
test('renders correctly', () => {
  node = new RichTextNode({ ... })
  canvas = node._render()

  // Compare to known good image
  expect(canvas.toDataURL()).toMatchSnapshot()
})
```

## Common Bugs and Fixes

### 1. Caret Not Visible After Enter

**Problem**: Pressing Enter creates new line, but caret doesn't appear.

**Cause**: Layout engine doesn't create empty line for trailing newline.

**Fix**:
```pseudo
// In layout engine, after processing tokens:
if lastTokenWasNewline:
  // Create empty line for cursor
  lines.push(createEmptyLine(nextLineY))
```

### 2. Selection Highlighting Off-by-One

**Problem**: Selection highlight is shifted by one character.

**Cause**: Off-by-one error in position calculation.

**Fix**: Carefully check inclusive vs exclusive ranges:
```pseudo
// Selection range is [start, end) - end is exclusive
for each char in layout.chars:
  if char.absoluteIndex >= start and char.absoluteIndex < end:  // Not <=
    highlightChar(char)
```

### 3. Blurry Text on Retina Displays

**Problem**: Text looks fuzzy.

**Cause**: Not accounting for device pixel ratio.

**Fix**:
```pseudo
dpr = window.devicePixelRatio
canvas.width = logicalWidth * dpr
canvas.height = logicalHeight * dpr
ctx.scale(dpr, dpr)
```

### 4. Memory Leak on Repeated Editing

**Problem**: Memory grows over time.

**Cause**: Event listeners not cleaned up.

**Fix**: Track and remove all listeners in `stopEditing()` and `destroy()`.

### 5. Cursor Position Wrong After Resize

**Problem**: After resizing text box, clicking positions caret incorrectly.

**Cause**: Layout not recalculated after resize.

**Fix**: Call `relayout()` after transform:
```pseudo
function _handleTransform():
  // Update dimensions...
  this._markLayoutDirty()
  this._updateVisual()
```

### 6. Styles Not Applied to New Text

**Problem**: Typing after clicking Bold button doesn't make text bold.

**Cause**: `_currentStyle` not updated.

**Fix**: Track style state for next character:
```pseudo
function toggleBold():
  if not hasSelection():
    this._currentStyle.fontWeight = // toggle
```

### 7. Undo Doesn't Restore Selection

**Problem**: Undo restores text but not cursor position.

**Cause**: Selection not saved with history.

**Fix**: Include selection in history entry:
```pseudo
historyEntry = {
  document: doc,
  selection: selection  // Save this too!
}
```

## Production Checklist

Before shipping:

### Performance
- [ ] Layout caching works
- [ ] Render batching with requestAnimationFrame
- [ ] No memory leaks (test with DevTools Memory tab)
- [ ] Large documents (1000+ characters) perform well

### Functionality
- [ ] All keyboard shortcuts work
- [ ] Mouse selection accurate
- [ ] Undo/redo complete cycle
- [ ] Copy/paste works
- [ ] Lists renumber correctly
- [ ] Styles apply and toggle properly

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (if needed)

### Accessibility
- [ ] Keyboard navigation works
- [ ] ARIA labels (if applicable)
- [ ] Color contrast sufficient

### Edge Cases
- [ ] Empty document handling
- [ ] Very long words
- [ ] Rapid typing
- [ ] Large paste operations
- [ ] Window resize
- [ ] Transform (scale, rotate) operations

## Extending the Editor

### Custom Block Types

```pseudo
// Add support for images, dividers, code blocks
BlockType = 'text' | 'image' | 'code' | 'divider'

Block = {
  type: BlockType,
  content: TextContent | ImageContent | ...
}

Document = {
  blocks: Block[]
}
```

### Collaborative Editing (Advanced)

```pseudo
// Operational Transformation
Operation = {
  type: 'insert' | 'delete' | 'style',
  position: number,
  data: any,
  timestamp: number
}

function transformOperation(op1, op2):
  // Adjust positions based on concurrent operations
  // This is complex - see OT papers/libraries
```

### Export/Import

```pseudo
function exportToHTML(doc):
  html = ''
  for each span in doc.spans:
    style = buildInlineStyle(span.style)
    html += `<span style="${style}">${escapeHTML(span.text)}</span>`
  return html

function exportToMarkdown(doc):
  // Convert formatting to markdown syntax
  // Bold → **text**
  // Italic → *text*
  // Lists → - item

function importFromHTML(html):
  // Parse HTML and build document
  // This is complex - consider using a library
```

## Final Architecture Overview

```
RichTextNode (Konva.Group)
├── _hitRegion (Konva.Rect) - Click detection
├── _background (Konva.Rect) - Visual background
├── _imageNode (Konva.Image) - Rendered text
│
├── State
│   ├── _document (RichTextDocument) - Source of truth
│   ├── _selection (Selection) - Cursor/selection
│   ├── _layout (LayoutResult) - Computed positions
│   ├── _currentStyle (TextStyle) - Style for next char
│   └── _isEditing (boolean) - Edit mode flag
│
├── Systems
│   ├── HistoryManager - Undo/Redo
│   ├── LayoutEngine - Text positioning
│   ├── Renderer - Canvas drawing
│   └── InputHandler - Keyboard/Mouse
│
└── Lifecycle
    ├── constructor() - Initialize
    ├── startEditing() - Enter edit mode
    ├── stopEditing() - Exit edit mode
    ├── _updateVisual() - Render pipeline
    └── destroy() - Cleanup
```

## Congratulations!

You've learned how to build a complete rich text editor in canvas:

1. **Document Model** - Span-based, immutable operations
2. **Layout Engine** - Text measurement, line breaking, positioning
3. **Renderer** - Canvas drawing, device pixel ratio, decorations
4. **Input Handling** - Keyboard, mouse, selection management
5. **Advanced Features** - Undo/redo, lists, formatting
6. **Integration** - Konva component, production polish

This is a significant engineering achievement. You now have deep understanding of text rendering that most web developers never gain.

## Next Steps

1. **Build your variation** - Apply these concepts to your specific needs
2. **Optimize further** - Virtual rendering, web workers, WASM
3. **Add features** - Tables, images, collaborative editing
4. **Share knowledge** - Blog about your learnings
5. **Contribute back** - Open source your improvements

Remember: The best text editor is the one that solves your specific problem. Now you have the knowledge to build exactly that.

Good luck with your rich text editor! 🚀

---

## Resources

### Canvas Text
- [MDN Canvas Text](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text)
- [TextMetrics API](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics)

### Konva.js
- [Konva Documentation](https://konvajs.org/docs/)
- [Custom Shapes](https://konvajs.org/docs/shapes/Custom.html)

### Text Editor Concepts
- [Google Docs Architecture](https://drive.googleblog.com/2010/05/whats-different-about-new-google-docs.html)
- [Operational Transformation](https://en.wikipedia.org/wiki/Operational_transformation)
- [CRDT for Collaborative Editing](https://crdt.tech/)

### Performance
- [High Performance Canvas](https://developer.chrome.com/blog/canvas-performance/)
- [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

[← Back to Tutorial Overview](./README.md)
