# Part 1: Foundation - The Document Model

The document model is the foundation of your text editor. It's the single source of truth that represents your text content and all its formatting. Every operation—typing, deleting, styling—modifies this model.

## The Core Challenge

You need to represent:
- Text content (the actual characters)
- Per-character styling (font, color, size, bold, italic, etc.)
- Document-level properties (alignment, padding)
- Structural information (lists, paragraphs)

### Approach 1: Per-Character Styles (Simple but Inefficient)

```pseudo
Document = [
  { char: 'H', style: { bold: true, color: 'red' } },
  { char: 'e', style: { bold: true, color: 'red' } },
  { char: 'l', style: { bold: true, color: 'red' } },
  { char: 'l', style: { bold: false, color: 'black' } },
  { char: 'o', style: { bold: false, color: 'black' } },
]
```

**Pros**: Simple to understand, easy to query any character's style
**Cons**: Extremely memory inefficient, redundant data

### Approach 2: Span-Based (Recommended)

```pseudo
Document = {
  spans: [
    { text: "Hel", style: { bold: true, color: 'red' } },
    { text: "lo", style: { bold: false, color: 'black' } }
  ]
}
```

**Pros**: Memory efficient, natural grouping, matches how users think
**Cons**: Slightly more complex operations

We'll use the span-based approach.

## Designing the Style Interface

Think about all possible text properties:

```pseudo
TextStyle = {
  // Font properties
  fontFamily: string        // "Arial", "Times New Roman"
  fontSize: number          // in pixels
  fontWeight: string/number // "normal", "bold", 700
  fontStyle: string         // "normal", "italic"

  // Color
  color: string             // text color
  backgroundColor: string   // highlight color (optional)

  // Decorations
  underline: boolean
  strikethrough: boolean

  // Spacing
  letterSpacing: number     // pixels between characters
  lineHeight: number        // multiplier (1.0, 1.5, 2.0)

  // Advanced (optional)
  stroke: { color, width }  // text outline
  shadow: { color, blur, offsetX, offsetY }
}
```

### Default Style

Always have a sensible default:

```pseudo
DEFAULT_STYLE = {
  fontFamily: "Arial",
  fontSize: 16,
  fontWeight: "normal",
  fontStyle: "normal",
  color: "#000000",
  underline: false,
  strikethrough: false,
  letterSpacing: 0,
  lineHeight: 1.4
}
```

## The Span Structure

Each span needs:
- Unique identifier (for tracking)
- Text content
- Complete style information

```pseudo
TextSpan = {
  id: string,           // unique identifier
  text: string,         // the actual text
  style: TextStyle      // complete style object
}
```

### Why Unique IDs?

IDs help with:
- Debugging (track which span a character belongs to)
- Potential collaborative editing
- React key props if rendering spans
- History tracking

Generate with timestamp + random:

```pseudo
function generateSpanId():
  return "span_" + timestamp() + "_" + randomString(9)
```

## The Complete Document

```pseudo
RichTextDocument = {
  spans: TextSpan[],

  // Document-level formatting
  align: "left" | "center" | "right" | "justify",
  verticalAlign: "top" | "middle" | "bottom",
  padding: number,

  // Structural elements
  listItems: Map<lineIndex, ListItem>  // which lines are list items
}

ListItem = {
  type: "bullet" | "number",
  level: number,  // nesting depth (0, 1, 2...)
  index: number   // for numbered lists
}
```

## Immutability: Critical Concept

**Never mutate the document directly.** Always create new objects.

### Why Immutability?

1. **Undo/Redo**: Store previous states easily
2. **Performance**: Shallow comparison for change detection
3. **Debugging**: Time-travel through states
4. **Predictability**: No unexpected side effects

### Bad (Mutating):

```pseudo
function setBold(doc, start, end):
  // DON'T DO THIS
  for each span in doc.spans:
    span.style.bold = true
  return doc
```

### Good (Immutable):

```pseudo
function setBold(doc, start, end):
  newSpans = []
  for each span in doc.spans:
    newSpan = {
      ...span,
      style: { ...span.style, bold: true }
    }
    newSpans.push(newSpan)

  return { ...doc, spans: newSpans }
```

## Core Document Operations

You need these fundamental operations:

### 1. Insert Text at Position

```pseudo
function insertText(doc, position, text, style):
  // Convert absolute position to span position
  { spanIndex, charOffset } = absoluteToSpanPosition(doc, position)

  targetSpan = doc.spans[spanIndex]

  // Check if style matches - if so, just insert into existing span
  if stylesEqual(targetSpan.style, style):
    newText = targetSpan.text.slice(0, charOffset) + text + targetSpan.text.slice(charOffset)
    newSpan = { ...targetSpan, text: newText }
    newSpans = replaceSpan(doc.spans, spanIndex, newSpan)
  else:
    // Need to split span and insert new one
    beforeText = targetSpan.text.slice(0, charOffset)
    afterText = targetSpan.text.slice(charOffset)

    newSpans = []
    // Add spans before target
    newSpans.push(...doc.spans.slice(0, spanIndex))

    // Split target span
    if beforeText:
      newSpans.push({ ...targetSpan, text: beforeText })

    // Insert new text with new style
    newSpans.push({ id: generateId(), text: text, style: style })

    if afterText:
      newSpans.push({ ...targetSpan, text: afterText })

    // Add spans after target
    newSpans.push(...doc.spans.slice(spanIndex + 1))

  return { ...doc, spans: normalizeSpans(newSpans) }
```

### 2. Delete Text Range

```pseudo
function deleteRange(doc, start, end):
  if start == end:
    return doc

  result = []
  currentPos = 0

  for each span in doc.spans:
    spanStart = currentPos
    spanEnd = currentPos + span.text.length

    if spanEnd <= start or spanStart >= end:
      // Span is completely outside deletion range
      result.push(span)
    else if spanStart >= start and spanEnd <= end:
      // Span is completely inside deletion range - skip it
      continue
    else:
      // Span partially overlaps - need to trim
      newText = ""

      if spanStart < start:
        // Keep text before deletion
        newText += span.text.slice(0, start - spanStart)

      if spanEnd > end:
        // Keep text after deletion
        newText += span.text.slice(end - spanStart)

      if newText:
        result.push({ ...span, text: newText })

    currentPos = spanEnd

  return { ...doc, spans: normalizeSpans(result) }
```

### 3. Apply Style to Range

```pseudo
function applyStyle(doc, start, end, newStyle):
  if start == end:
    return doc

  result = []
  currentPos = 0

  for each span in doc.spans:
    spanStart = currentPos
    spanEnd = currentPos + span.text.length

    if spanEnd <= start or spanStart >= end:
      // Outside range - keep as is
      result.push(span)
    else if spanStart >= start and spanEnd <= end:
      // Completely inside - apply style
      result.push({
        ...span,
        style: { ...span.style, ...newStyle }
      })
    else:
      // Partial overlap - need to split

      if spanStart < start:
        // Part before range keeps old style
        result.push({
          ...span,
          text: span.text.slice(0, start - spanStart)
        })

      // Middle part gets new style
      middleStart = max(0, start - spanStart)
      middleEnd = min(span.text.length, end - spanStart)
      result.push({
        id: generateId(),
        text: span.text.slice(middleStart, middleEnd),
        style: { ...span.style, ...newStyle }
      })

      if spanEnd > end:
        // Part after range keeps old style
        result.push({
          ...span,
          text: span.text.slice(end - spanStart)
        })

    currentPos = spanEnd

  return { ...doc, spans: normalizeSpans(result) }
```

### 4. Normalize Spans (Important!)

After operations, you may have:
- Empty spans (text = "")
- Adjacent spans with identical styles

Normalize to clean up:

```pseudo
function normalizeSpans(spans):
  if spans.length == 0:
    // Always have at least one span
    return [{ id: generateId(), text: "", style: DEFAULT_STYLE }]

  result = []

  for each span in spans:
    if span.text == "":
      continue  // Skip empty spans

    if result.length > 0:
      lastSpan = result[result.length - 1]

      if stylesEqual(lastSpan.style, span.style):
        // Merge adjacent spans with same style
        result[result.length - 1] = {
          ...lastSpan,
          text: lastSpan.text + span.text
        }
        continue

    result.push(span)

  if result.length == 0:
    return [{ id: generateId(), text: "", style: DEFAULT_STYLE }]

  return result
```

## Position Conversion Utilities

You need to convert between:
- **Absolute position**: Character index in full text (0, 1, 2...)
- **Span position**: { spanIndex, charOffset }

### Absolute to Span Position

```pseudo
function absoluteToSpanPosition(doc, absolutePos):
  currentPos = 0

  for i, span in enumerate(doc.spans):
    if currentPos + span.text.length > absolutePos:
      return {
        spanIndex: i,
        charOffset: absolutePos - currentPos
      }
    currentPos += span.text.length

  // Position at end of document
  lastIndex = doc.spans.length - 1
  return {
    spanIndex: lastIndex,
    charOffset: doc.spans[lastIndex].text.length
  }
```

### Get Total Document Length

```pseudo
function getDocumentLength(doc):
  total = 0
  for each span in doc.spans:
    total += span.text.length
  return total
```

### Get Flattened Text

```pseudo
function getDocumentText(doc):
  result = ""
  for each span in doc.spans:
    result += span.text
  return result
```

## Style Comparison

Deep comparison for style objects:

```pseudo
function stylesEqual(style1, style2):
  // Compare all properties
  if style1.fontFamily != style2.fontFamily: return false
  if style1.fontSize != style2.fontSize: return false
  if style1.fontWeight != style2.fontWeight: return false
  if style1.fontStyle != style2.fontStyle: return false
  if style1.color != style2.color: return false
  if style1.backgroundColor != style2.backgroundColor: return false
  if style1.underline != style2.underline: return false
  if style1.strikethrough != style2.strikethrough: return false
  if style1.letterSpacing != style2.letterSpacing: return false
  if style1.lineHeight != style2.lineHeight: return false

  // Compare nested objects carefully
  if !deepEqual(style1.stroke, style2.stroke): return false
  if !deepEqual(style1.shadow, style2.shadow): return false

  return true
```

## Line-Based Operations

For lists and paragraph operations, you need line awareness:

### Get Line Count

```pseudo
function getLineCount(doc):
  text = getDocumentText(doc)
  if text == "":
    return 1

  count = 1
  for each char in text:
    if char == '\n':
      count++

  return count
```

### Get Line Start Position

```pseudo
function getLineStartPosition(doc, lineIndex):
  text = getDocumentText(doc)
  currentLine = 0
  position = 0

  for i, char in enumerate(text):
    if currentLine == lineIndex:
      return i
    if char == '\n':
      currentLine++

  return text.length
```

### Get Line End Position

```pseudo
function getLineEndPosition(doc, lineIndex):
  text = getDocumentText(doc)
  currentLine = 0

  for i, char in enumerate(text):
    if char == '\n':
      if currentLine == lineIndex:
        return i
      currentLine++

  if currentLine == lineIndex:
    return text.length

  return text.length
```

## Edge Cases to Handle

### 1. Empty Document

Always have at least one span, even if empty:

```pseudo
function createEmptyDocument():
  return {
    spans: [{ id: generateId(), text: "", style: DEFAULT_STYLE }],
    align: "left",
    verticalAlign: "top",
    padding: 8,
    listItems: new Map()
  }
```

### 2. Inserting at Start/End

```pseudo
// Insert at very beginning
insertText(doc, 0, "Hello")

// Insert at very end
insertText(doc, getDocumentLength(doc), "World")
```

### 3. Deleting Entire Document

When deleting everything, ensure you keep an empty span:

```pseudo
function deleteAll(doc):
  return createEmptyDocument()
```

### 4. Style at Empty Selection

When cursor is at position with no selection, track "current style" separately for new text:

```pseudo
class Editor:
  document: RichTextDocument
  currentStyle: TextStyle  // Style for next typed character

  function typeCharacter(char):
    doc = insertText(this.document, cursorPos, char, this.currentStyle)
    this.document = doc
```

## Testing Your Document Model

Write tests for each operation:

```pseudo
// Test insert
doc = createDocument("Hello")
doc = insertText(doc, 5, " World")
assert getDocumentText(doc) == "Hello World"

// Test delete
doc = createDocument("Hello World")
doc = deleteRange(doc, 5, 11)  // Delete " World"
assert getDocumentText(doc) == "Hello"

// Test style application
doc = createDocument("Hello World")
doc = applyStyle(doc, 0, 5, { bold: true })
assert doc.spans[0].text == "Hello"
assert doc.spans[0].style.bold == true
assert doc.spans[1].text == " World"
assert doc.spans[1].style.bold == false
```

## Key Decisions Recap

1. **Span-based model** for efficiency
2. **Immutable operations** for undo/redo and predictability
3. **Normalization** after every operation
4. **Position conversion utilities** for span ↔ absolute
5. **Style comparison** for merging spans
6. **Line awareness** for paragraph operations

## Extension Points

Your document model can be extended for:

- **Tables**: Add cell structure
- **Images**: Embed inline image spans
- **Custom objects**: Any non-text content
- **Annotations**: Comments, highlights, marks
- **Collaborative editing**: Operation transformations

## What's Next?

You now have a solid document model. In [Part 2: Text Measurement & Layout Engine](./PART2_LAYOUT_ENGINE.md), we'll learn how to:

- Measure text dimensions using Canvas API
- Break text into lines that fit the container
- Position each character for rendering
- Handle mixed styles within a line

The layout engine is where the magic happens—transforming your abstract document into precise pixel positions.

[Continue to Part 2 →](./PART2_LAYOUT_ENGINE.md)
