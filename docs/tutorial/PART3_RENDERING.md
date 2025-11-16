# Part 3: Rendering Pipeline

Now that your layout engine computes exact positions, it's time to paint pixels to the canvas. The rendering pipeline transforms your layout result into visual output.

## The Rendering Challenge

You need to render:
- Text characters with proper fonts
- Colors and background highlights
- Decorations (underline, strikethrough)
- Effects (shadow, stroke)
- Sharp text at any resolution
- List markers (bullets, numbers)

## The Offscreen Canvas Pattern

**Don't render directly to your main Konva canvas.** Instead:

1. Create an offscreen canvas
2. Render everything there
3. Transfer result to Konva as an image

```pseudo
class TextRenderer:
  offscreenCanvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  function initialize(width, height):
    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCanvas.width = width
    this.offscreenCanvas.height = height
    this.ctx = this.offscreenCanvas.getContext('2d')
```

### Why Offscreen?

1. **Performance**: Batch all drawing operations
2. **Isolation**: Don't pollute main canvas state
3. **Flexibility**: Can apply effects to entire result
4. **Konva Integration**: Konva.Image works with canvas/image data

## Device Pixel Ratio (DPR)

Modern displays have high pixel density. A "logical" pixel might be 2-3 actual pixels.

```pseudo
dpr = window.devicePixelRatio || 1

// Canvas dimensions
canvas.width = logicalWidth * dpr
canvas.height = logicalHeight * dpr
canvas.style.width = logicalWidth + 'px'
canvas.style.height = logicalHeight + 'px'

// Scale context
ctx.scale(dpr, dpr)
```

This gives you crisp text on retina displays.

### Complete Setup

```pseudo
function setupOffscreenCanvas(width, height):
  dpr = window.devicePixelRatio || 1

  canvas = document.createElement('canvas')
  canvas.width = width * dpr
  canvas.height = height * dpr

  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // Important: Enable smooth text rendering
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  return { canvas, ctx, dpr }
```

## Rendering Order

Order matters! Render bottom to top:

1. **Background** (container fill)
2. **Text highlights** (background colors)
3. **Text characters**
4. **Text decorations** (underline, strikethrough)
5. **Shadows and effects**
6. **Caret and selection** (if editing)
7. **List markers**

```pseudo
function render(layout, doc, width, height):
  { canvas, ctx } = setupOffscreenCanvas(width, height)

  // 1. Clear/fill background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // 2. Draw text highlights
  renderHighlights(ctx, layout)

  // 3. Draw text characters
  renderCharacters(ctx, layout)

  // 4. Draw decorations
  renderDecorations(ctx, layout)

  // 5. Draw list markers
  renderListMarkers(ctx, layout, doc)

  return canvas
```

## Rendering Text Characters

The core rendering function:

```pseudo
function renderCharacters(ctx, layout):
  for each positionedChar in layout.chars:
    char = positionedChar.char
    style = char.style

    // Set font
    ctx.font = buildFontString(style)

    // Set color
    ctx.fillStyle = style.color

    // Handle shadow (must be set before drawing)
    if style.shadow:
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur
      ctx.shadowOffsetX = style.shadow.offsetX
      ctx.shadowOffsetY = style.shadow.offsetY
    else:
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

    // Calculate baseline Y position
    baselineY = positionedChar.y + positionedChar.baseline

    // Draw stroke first (behind fill)
    if style.stroke:
      ctx.strokeStyle = style.stroke.color
      ctx.lineWidth = style.stroke.width
      ctx.strokeText(char.char, positionedChar.x, baselineY)

    // Draw filled text
    ctx.fillText(char.char, positionedChar.x, baselineY)

    // Reset shadow after each char (performance consideration)
    if style.shadow:
      ctx.shadowColor = 'transparent'
```

### Batching for Performance

Drawing char-by-char is slow. Batch consecutive chars with same style:

```pseudo
function renderCharactersBatched(ctx, layout):
  batches = groupCharsByStyle(layout.chars)

  for each batch in batches:
    style = batch.style

    // Set up context once for batch
    ctx.font = buildFontString(style)
    ctx.fillStyle = style.color
    setupShadow(ctx, style.shadow)

    // Draw all chars in batch
    for each positionedChar in batch.chars:
      baselineY = positionedChar.y + positionedChar.baseline
      ctx.fillText(positionedChar.char.char, positionedChar.x, baselineY)

    // Even better: concatenate chars on same line
    // (only works if no letter spacing)
```

### Advanced: Text Rendering with Canvas

```pseudo
function groupCharsByStyle(chars):
  result = []
  currentBatch = null

  for each char in chars:
    if currentBatch == null:
      currentBatch = { style: char.char.style, chars: [char] }
    else if stylesEqual(currentBatch.style, char.char.style):
      currentBatch.chars.push(char)
    else:
      result.push(currentBatch)
      currentBatch = { style: char.char.style, chars: [char] }

  if currentBatch:
    result.push(currentBatch)

  return result
```

## Rendering Highlights (Background Color)

Draw rectangles behind text:

```pseudo
function renderHighlights(ctx, layout):
  for each positionedChar in layout.chars:
    bgColor = positionedChar.char.style.backgroundColor

    if bgColor:
      ctx.fillStyle = bgColor
      ctx.fillRect(
        positionedChar.x,
        positionedChar.y,
        positionedChar.width,
        positionedChar.height
      )
```

### Optimized: Merge Adjacent Highlights

Don't draw overlapping rectangles:

```pseudo
function renderHighlightsOptimized(ctx, layout):
  // Group by line and color
  for each line in layout.lines:
    highlightRuns = []
    currentRun = null

    for each char in line.chars:
      bgColor = char.char.style.backgroundColor

      if bgColor:
        if currentRun and currentRun.color == bgColor:
          currentRun.endX = char.x + char.width
        else:
          if currentRun:
            highlightRuns.push(currentRun)
          currentRun = {
            color: bgColor,
            startX: char.x,
            endX: char.x + char.width,
            y: char.y,
            height: char.height
          }
      else if currentRun:
        highlightRuns.push(currentRun)
        currentRun = null

    if currentRun:
      highlightRuns.push(currentRun)

    // Draw merged rectangles
    for each run in highlightRuns:
      ctx.fillStyle = run.color
      ctx.fillRect(run.startX, run.y, run.endX - run.startX, run.height)
```

## Rendering Decorations

### Underline

```pseudo
function renderUnderlines(ctx, layout):
  for each line in layout.lines:
    underlineRuns = findRunsWithStyle(line.chars, 'underline')

    for each run in underlineRuns:
      startX = run.startX
      endX = run.endX
      y = line.y + line.baseline + 2  // 2px below baseline

      ctx.strokeStyle = run.color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
```

### Strikethrough

```pseudo
function renderStrikethroughs(ctx, layout):
  for each line in layout.lines:
    strikeRuns = findRunsWithStyle(line.chars, 'strikethrough')

    for each run in strikeRuns:
      startX = run.startX
      endX = run.endX
      // Middle of text (roughly)
      y = line.y + line.baseline - (line.height * 0.3)

      ctx.strokeStyle = run.color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
```

### Helper: Find Style Runs

```pseudo
function findRunsWithStyle(chars, styleProperty):
  runs = []
  currentRun = null

  for each char in chars:
    hasStyle = char.char.style[styleProperty]

    if hasStyle:
      if currentRun:
        currentRun.endX = char.x + char.width
      else:
        currentRun = {
          startX: char.x,
          endX: char.x + char.width,
          color: char.char.style.color
        }
    else if currentRun:
      runs.push(currentRun)
      currentRun = null

  if currentRun:
    runs.push(currentRun)

  return runs
```

## Rendering List Markers

Draw bullets or numbers before list items:

```pseudo
function renderListMarkers(ctx, layout, doc):
  for each line in layout.lines:
    if line.listItem:
      renderListMarker(ctx, line, doc.padding)

function renderListMarker(ctx, line, padding):
  listItem = line.listItem

  if listItem.type == 'bullet':
    renderBullet(ctx, line, listItem.level, padding)
  else if listItem.type == 'number':
    renderNumber(ctx, line, listItem.index, listItem.level, padding)

function renderBullet(ctx, line, level, padding):
  // Position bullet in indentation zone
  bulletX = padding + (level * 20) + 10
  bulletY = line.y + line.baseline - 4

  // Different markers for different levels
  ctx.fillStyle = '#000000'

  switch level % 3:
    case 0:  // Filled circle
      ctx.beginPath()
      ctx.arc(bulletX, bulletY, 3, 0, Math.PI * 2)
      ctx.fill()

    case 1:  // Empty circle
      ctx.beginPath()
      ctx.arc(bulletX, bulletY, 3, 0, Math.PI * 2)
      ctx.stroke()

    case 2:  // Square
      ctx.fillRect(bulletX - 3, bulletY - 3, 6, 6)

function renderNumber(ctx, line, index, level, padding):
  numberX = padding + (level * 20)
  numberY = line.y + line.baseline

  ctx.font = '14px Arial'
  ctx.fillStyle = '#000000'

  // Different formats for different levels
  switch level % 3:
    case 0:  // 1. 2. 3.
      text = index + '.'
    case 1:  // a. b. c.
      text = String.fromCharCode(96 + index) + '.'
    case 2:  // i. ii. iii.
      text = toRomanNumeral(index) + '.'

  ctx.fillText(text, numberX, numberY)
```

## Rendering Selection

Highlight selected text:

```pseudo
function renderSelection(ctx, layout, selection):
  if selection.anchor == selection.focus:
    return  // No selection, just caret

  start = min(selection.anchor, selection.focus)
  end = max(selection.anchor, selection.focus)

  ctx.fillStyle = 'rgba(0, 120, 255, 0.3)'  // Semi-transparent blue

  for each char in layout.chars:
    if char.char.absoluteIndex >= start and char.char.absoluteIndex < end:
      ctx.fillRect(char.x, char.y, char.width, char.height)
```

## Rendering Caret

Draw the blinking cursor:

```pseudo
function renderCaret(ctx, caretPosition, visible):
  if not visible:
    return

  ctx.fillStyle = '#000000'
  ctx.fillRect(
    caretPosition.x,
    caretPosition.y,
    2,                    // Caret width
    caretPosition.height
  )
```

## Calculating Caret Position

Where to draw the caret based on document position:

```pseudo
function getCaretPosition(layout, absoluteIndex, doc):
  // Check if caret is at a character
  for each char in layout.chars:
    if char.char.absoluteIndex == absoluteIndex:
      return {
        x: char.x,
        y: char.y,
        height: char.height
      }

  // Caret might be after last character
  if absoluteIndex > 0 and layout.chars.length > 0:
    lastChar = layout.chars[layout.chars.length - 1]
    if absoluteIndex == lastChar.char.absoluteIndex + 1:
      return {
        x: lastChar.x + lastChar.width,
        y: lastChar.y,
        height: lastChar.height
      }

  // Special case: empty document or after newline
  text = getDocumentText(doc)
  if absoluteIndex > 0 and text[absoluteIndex - 1] == '\n':
    // Find the line after the newline
    lineIndex = countNewlinesBefore(text, absoluteIndex)
    line = layout.lines[lineIndex]
    return {
      x: doc.padding + (line.listIndent || 0),
      y: line.y,
      height: line.height
    }

  // Fallback: first position
  if layout.lines.length > 0:
    line = layout.lines[0]
    return {
      x: doc.padding,
      y: line.y,
      height: line.height
    }

  // Empty layout
  return {
    x: doc.padding,
    y: doc.padding,
    height: DEFAULT_LINE_HEIGHT
  }
```

## Putting It All Together

Complete render function:

```pseudo
function renderRichText(layout, doc, width, height, selection, caretVisible):
  { canvas, ctx } = setupOffscreenCanvas(width, height)

  // Clear
  ctx.clearRect(0, 0, width, height)

  // Background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // Highlights (text background)
  renderHighlights(ctx, layout)

  // Selection
  renderSelection(ctx, layout, selection)

  // Text
  renderCharacters(ctx, layout)

  // Decorations
  renderUnderlines(ctx, layout)
  renderStrikethroughs(ctx, layout)

  // List markers
  renderListMarkers(ctx, layout, doc)

  // Caret
  caretPos = getCaretPosition(layout, selection.focus, doc)
  renderCaret(ctx, caretPos, caretVisible)

  return canvas
```

## Konva Integration

Transfer offscreen canvas to Konva:

```pseudo
class RichTextNode extends Konva.Group:
  _offscreenCanvas: HTMLCanvasElement
  _imageNode: Konva.Image

  function _updateVisual():
    // Run layout
    layout = computeLayout(this._document, this.width(), this.height())

    // Render to offscreen canvas
    canvas = renderRichText(layout, this._document, this.width(), this.height(), this._selection, this._caretVisible)

    this._offscreenCanvas = canvas

    // Update Konva image
    if not this._imageNode:
      this._imageNode = new Konva.Image({
        image: canvas,
        width: this.width(),
        height: this.height()
      })
      this.add(this._imageNode)
    else:
      this._imageNode.image(canvas)

    this.getLayer().batchDraw()
```

## Performance Optimizations

### 1. Dirty Rectangles

Only redraw changed regions:

```pseudo
function renderDirty(layout, dirtyRects):
  for each rect in dirtyRects:
    ctx.save()
    ctx.beginPath()
    ctx.rect(rect.x, rect.y, rect.width, rect.height)
    ctx.clip()

    // Render only within clipped area
    renderArea(ctx, layout, rect)

    ctx.restore()
```

### 2. Layer Caching

Cache static parts (rarely changes):
- Text without caret/selection
- List markers

```pseudo
_cachedTextLayer: HTMLCanvasElement
_needsTextRedraw: boolean

function render():
  if _needsTextRedraw:
    // Full text redraw
    renderTextToCache()
    _needsTextRedraw = false

  // Fast path: just redraw dynamic elements
  ctx.drawImage(_cachedTextLayer, 0, 0)
  renderSelection()
  renderCaret()
```

### 3. RequestAnimationFrame

Don't redraw on every change. Batch:

```pseudo
_renderPending = false

function requestRender():
  if _renderPending:
    return

  _renderPending = true
  requestAnimationFrame(() => {
    this._updateVisual()
    _renderPending = false
  })
```

### 4. Use `will-change` CSS

```pseudo
canvas.style.willChange = 'transform'
```

## Common Rendering Issues

### Blurry Text

- Check DPR scaling
- Ensure canvas dimensions are integers
- Verify `ctx.scale(dpr, dpr)` is called

### Flickering

- Use offscreen canvas
- Batch all draws
- Use `requestAnimationFrame`

### Memory Leaks

- Clean up old canvases
- Remove event listeners
- Clear references to DOM elements

### Incorrect Positions

- Check coordinate system (screen vs canvas)
- Verify DPR scaling consistency
- Ensure baseline calculations are correct

## Testing Rendering

Visual testing is tricky. Consider:

1. **Snapshot testing**: Compare rendered output
2. **Unit test individual functions**: Highlight merging, style runs
3. **Manual visual inspection**: For edge cases
4. **Performance benchmarks**: Measure render time

```pseudo
// Test highlight merging
chars = createTestCharsWithHighlights()
runs = findHighlightRuns(chars)
assert runs.length == expectedCount

// Test caret position
doc = createDocument("Hello\nWorld")
caretPos = getCaretPosition(layout, 6, doc)  // Start of "World"
assert caretPos.y == secondLineY
```

## Summary

The rendering pipeline:
1. **Setup** offscreen canvas with DPR scaling
2. **Render** in correct order (background → highlights → text → decorations)
3. **Handle** different text styles efficiently
4. **Draw** list markers and visual elements
5. **Render** selection and caret
6. **Transfer** to Konva as an image
7. **Optimize** with caching and batching

## What's Next?

Your text editor now displays beautifully. But users can't interact with it yet! In [Part 4: Input Handling & Selection](./PART4_INPUT_SELECTION.md), we'll cover:

- Keyboard input without DOM text fields
- Mouse click to position caret
- Drag selection
- Hit testing (screen coordinates to document position)
- Caret blinking animation

[Continue to Part 4 →](./PART4_INPUT_SELECTION.md)
