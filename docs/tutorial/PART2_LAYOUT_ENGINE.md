# Part 2: Text Measurement & Layout Engine

The layout engine is the brain of your text editor. It transforms your document model into precise pixel positions for every character. This is where complexity lives—and where you gain full control over text rendering.

## The Layout Pipeline

```
Document
    ↓
[Flatten to Styled Characters]
    ↓
[Tokenize into Words/Whitespace/Newlines]
    ↓
[Measure Each Token]
    ↓
[Line Breaking Algorithm]
    ↓
[Position Characters Within Lines]
    ↓
[Apply Alignment]
    ↓
Layout Result
```

## Understanding Canvas Text Metrics

Before we can layout text, we must measure it. Canvas provides `measureText()`:

```pseudo
ctx = canvas.getContext('2d')
ctx.font = "16px Arial"
metrics = ctx.measureText("Hello")

// Available metrics:
metrics.width                    // Total width of text
metrics.actualBoundingBoxAscent  // Height above baseline
metrics.actualBoundingBoxDescent // Height below baseline
metrics.fontBoundingBoxAscent    // Max ascent for font
metrics.fontBoundingBoxDescent   // Max descent for font
```

### Important Concepts

**Baseline**: The invisible line text sits on. Letters like 'g' and 'y' have descenders that go below.

```
     Top of 'A'
         ↓
        A g    ← Baseline
          ↓
       Descender
```

**Ascent**: Distance from baseline to top of tallest character
**Descent**: Distance from baseline to bottom of lowest character
**Line Height**: Total vertical space = (ascent + descent) × lineHeightMultiplier

## Step 1: Flatten Document to Styled Characters

Convert spans to individual characters with their styles:

```pseudo
function flattenToStyledChars(doc):
  result = []
  absoluteIndex = 0

  for each span in doc.spans:
    for each char in span.text:
      result.push({
        char: char,
        style: span.style,
        spanId: span.id,
        absoluteIndex: absoluteIndex
      })
      absoluteIndex++

  return result
```

Now every character knows its style and position.

## Step 2: Tokenization

Group characters into tokens for layout purposes:

**Token Types:**
- **Word**: Sequence of non-space, non-newline characters
- **Whitespace**: Spaces (we keep them for width calculation)
- **Newline**: Forces line break

```pseudo
function tokenize(styledChars):
  tokens = []
  currentToken = { chars: [], type: null }

  for each char in styledChars:
    charType = getCharType(char.char)  // 'word', 'whitespace', or 'newline'

    if charType == 'newline':
      // Finish current token
      if currentToken.chars.length > 0:
        tokens.push(currentToken)

      // Add newline as its own token
      tokens.push({ chars: [char], type: 'newline', width: 0 })

      // Reset
      currentToken = { chars: [], type: null }

    else if currentToken.type == charType:
      // Same type - add to current token
      currentToken.chars.push(char)

    else:
      // Type changed - finish current token, start new
      if currentToken.chars.length > 0:
        tokens.push(currentToken)

      currentToken = { chars: [char], type: charType }

  // Don't forget last token
  if currentToken.chars.length > 0:
    tokens.push(currentToken)

  return tokens

function getCharType(char):
  if char == '\n': return 'newline'
  if char == ' ' or char == '\t': return 'whitespace'
  return 'word'
```

## Step 3: Measure Tokens

Now measure each token's width. This is tricky because a single token can have mixed styles!

```pseudo
function measureToken(token, ctx):
  if token.type == 'newline':
    token.width = 0
    return

  totalWidth = 0

  // Group consecutive chars with same style
  styleRuns = groupByStyle(token.chars)

  for each run in styleRuns:
    // Set canvas font for this style
    ctx.font = buildFontString(run.style)

    // Measure the text
    text = run.chars.map(c => c.char).join('')
    metrics = ctx.measureText(text)

    // Add letter spacing
    letterSpacing = run.style.letterSpacing * run.chars.length
    totalWidth += metrics.width + letterSpacing

  token.width = totalWidth
```

### Building Font String

Canvas needs a specific format:

```pseudo
function buildFontString(style):
  // Format: "italic bold 16px Arial"
  parts = []

  if style.fontStyle == 'italic':
    parts.push('italic')

  if style.fontWeight != 'normal':
    parts.push(style.fontWeight.toString())

  parts.push(style.fontSize + 'px')
  parts.push(style.fontFamily)

  return parts.join(' ')
```

## Step 4: Line Breaking Algorithm

This is the core challenge: fitting tokens into lines that respect the container width.

```pseudo
function breakIntoLines(tokens, containerWidth, padding, listIndent):
  lines = []
  currentLine = { tokens: [], width: 0 }
  availableWidth = containerWidth - (padding * 2) - listIndent

  for each token in tokens:
    if token.type == 'newline':
      // Force line break
      lines.push(currentLine)
      currentLine = { tokens: [], width: 0 }
      continue

    if currentLine.width + token.width <= availableWidth:
      // Token fits on current line
      currentLine.tokens.push(token)
      currentLine.width += token.width

    else if token.type == 'whitespace':
      // Don't start line with whitespace
      if currentLine.tokens.length > 0:
        // Finish current line, skip this whitespace
        lines.push(currentLine)
        currentLine = { tokens: [], width: 0 }

    else:
      // Word doesn't fit
      if currentLine.tokens.length == 0:
        // Word is too long for any line - must break word
        brokenTokens = breakWord(token, availableWidth, ctx)
        for each brokenToken in brokenTokens:
          if currentLine.tokens.length > 0:
            lines.push(currentLine)
            currentLine = { tokens: [], width: 0 }
          currentLine.tokens.push(brokenToken)
          currentLine.width += brokenToken.width
      else:
        // Start new line with this word
        lines.push(currentLine)
        currentLine = { tokens: [token], width: token.width }

  // Don't forget last line
  if currentLine.tokens.length > 0:
    lines.push(currentLine)

  return lines
```

### Breaking Long Words

When a word is longer than the line width:

```pseudo
function breakWord(token, maxWidth, ctx):
  result = []
  currentChars = []
  currentWidth = 0

  for each char in token.chars:
    charWidth = measureSingleChar(char, ctx)

    if currentWidth + charWidth > maxWidth and currentChars.length > 0:
      // Break here
      result.push({ chars: currentChars, type: 'word', width: currentWidth })
      currentChars = [char]
      currentWidth = charWidth
    else:
      currentChars.push(char)
      currentWidth += charWidth

  if currentChars.length > 0:
    result.push({ chars: currentChars, type: 'word', width: currentWidth })

  return result
```

## Step 5: Position Characters

Now we know which tokens go on which lines. Time to assign exact (x, y) coordinates to each character.

```pseudo
function positionCharacters(lines, containerWidth, padding, doc):
  result = []
  yOffset = padding

  for lineIndex, line in enumerate(lines):
    // Calculate line height (max of all chars in line)
    lineHeight = calculateLineHeight(line)
    baseline = calculateBaseline(line)

    // Handle alignment
    lineWidth = line.width
    xOffset = calculateXOffset(lineWidth, containerWidth, padding, doc.align)

    // Position each character
    for each token in line.tokens:
      for each char in token.chars:
        charWidth = measureSingleChar(char, ctx)

        result.push({
          char: char,
          x: xOffset,
          y: yOffset,
          width: charWidth,
          height: lineHeight,
          baseline: baseline,
          lineIndex: lineIndex
        })

        xOffset += charWidth + char.style.letterSpacing

    yOffset += lineHeight

  return result
```

### Calculate Line Height

A line's height is determined by its tallest character:

```pseudo
function calculateLineHeight(line):
  maxHeight = 0

  for each token in line.tokens:
    for each char in token.chars:
      ctx.font = buildFontString(char.style)
      metrics = ctx.measureText('M')  // Use 'M' for consistent height

      ascent = metrics.actualBoundingBoxAscent
      descent = metrics.actualBoundingBoxDescent
      height = (ascent + descent) * char.style.lineHeight

      maxHeight = max(maxHeight, height)

  return maxHeight
```

### Calculate Alignment Offset

```pseudo
function calculateXOffset(lineWidth, containerWidth, padding, align):
  availableWidth = containerWidth - (padding * 2)

  switch align:
    case 'left':
      return padding
    case 'center':
      return padding + (availableWidth - lineWidth) / 2
    case 'right':
      return padding + availableWidth - lineWidth
    case 'justify':
      return padding  // Special handling needed
```

## Justified Text (Advanced)

For justified text, distribute extra space between words:

```pseudo
function justifyLine(line, availableWidth, padding):
  if line.tokens.length <= 1:
    return  // Can't justify single word

  // Count spaces
  spaceCount = countWhitespaceTokens(line.tokens)
  if spaceCount == 0:
    return

  // Calculate extra space to distribute
  extraSpace = availableWidth - line.width
  spaceAddition = extraSpace / spaceCount

  // Add extra width to each whitespace token
  for each token in line.tokens:
    if token.type == 'whitespace':
      token.width += spaceAddition

  // Don't justify last line of paragraph
```

## The Layout Result

Your layout engine returns a comprehensive result:

```pseudo
LayoutResult = {
  lines: LayoutLine[],       // All lines with metadata
  chars: PositionedChar[],   // All characters with positions
  width: number,             // Total content width
  height: number             // Total content height
}

LayoutLine = {
  chars: PositionedChar[],   // Characters in this line
  y: number,                 // Y position of line
  height: number,            // Line height
  baseline: number,          // Baseline Y within line
  width: number,             // Actual content width
  lineIndex: number,         // 0-based line number
  listItem: ListItem,        // If this line is a list item
  listIndent: number         // Indentation in pixels
}

PositionedChar = {
  char: StyledChar,          // Original character with style
  x: number,                 // X position
  y: number,                 // Y position (top of line)
  width: number,             // Character width
  height: number,            // Line height
  baseline: number,          // Y offset to baseline
  lineIndex: number          // Which line it's on
}
```

## Handling Lists

Lists add indentation. Track which lines are list items:

```pseudo
function layoutWithLists(tokens, containerWidth, padding, listItems):
  lines = []
  currentLine = { tokens: [], width: 0 }
  lineIndex = 0

  // Determine indentation for current line
  listItem = listItems.get(lineIndex)
  listIndent = listItem ? calculateListIndent(listItem.level) : 0
  availableWidth = containerWidth - (padding * 2) - listIndent

  // ... line breaking logic ...

  // When starting new line:
  lineIndex++
  listItem = listItems.get(lineIndex)
  listIndent = listItem ? calculateListIndent(listItem.level) : 0
  availableWidth = containerWidth - (padding * 2) - listIndent
```

### Calculate List Indentation

```pseudo
function calculateListIndent(level):
  baseIndent = 30      // Space for bullet/number
  levelIndent = 20     // Additional indent per level
  return baseIndent + (level * levelIndent)
```

## Caching for Performance

Text measurement is expensive. Cache results:

```pseudo
class MeasurementCache:
  cache = new Map()

  function measureChar(char, style):
    key = char + JSON.stringify(style)
    if cache.has(key):
      return cache.get(key)

    ctx.font = buildFontString(style)
    width = ctx.measureText(char).width
    cache.set(key, width)
    return width

  function clear():
    cache.clear()
```

**When to invalidate cache:**
- Font loading complete
- Style definitions change
- Memory pressure

## Handling Empty Lines

Empty lines (just newlines) need special handling:

```pseudo
function processNewline(currentLine, lines, lineIndex, listItems):
  // Finish current line
  lines.push(currentLine)

  // Check if we need a placeholder for empty line
  if currentLine.tokens.length == 0:
    // This was an empty line - ensure it has proper height
    lines[lines.length - 1].height = DEFAULT_LINE_HEIGHT

  // Increment line index
  lineIndex++
```

## Edge Cases

### 1. Empty Document

```pseudo
function layoutEmptyDocument(doc, containerWidth):
  // Still need one line for cursor
  return {
    lines: [{
      chars: [],
      y: doc.padding,
      height: DEFAULT_LINE_HEIGHT,
      baseline: calculateDefaultBaseline(),
      width: 0,
      lineIndex: 0,
      listIndent: 0
    }],
    chars: [],
    width: containerWidth,
    height: DEFAULT_LINE_HEIGHT + (doc.padding * 2)
  }
```

### 2. Very Long Words

See `breakWord()` above—split them across lines.

### 3. Trailing Newlines

If document ends with `\n`, create empty line for cursor:

```pseudo
// After processing all tokens
if lastTokenWasNewline:
  lines.push({
    tokens: [],
    width: 0,
    height: DEFAULT_LINE_HEIGHT,
    lineIndex: lines.length
  })
```

### 4. Mixed Font Sizes in One Line

Line height must accommodate largest font:

```
Small text [BIG TEXT] small text
           ↑
    This sets line height
```

Already handled by `calculateLineHeight()`.

## Vertical Alignment

Position entire text block within container:

```pseudo
function applyVerticalAlignment(layout, containerHeight, verticalAlign):
  contentHeight = layout.height
  offsetY = 0

  switch verticalAlign:
    case 'top':
      offsetY = 0
    case 'middle':
      offsetY = (containerHeight - contentHeight) / 2
    case 'bottom':
      offsetY = containerHeight - contentHeight

  // Shift all Y positions
  for each char in layout.chars:
    char.y += offsetY

  for each line in layout.lines:
    line.y += offsetY

  return layout
```

## Performance Considerations

1. **Batch measurements**: Measure entire words, not char-by-char
2. **Cache aggressively**: Font metrics don't change for same style
3. **Avoid reflow**: Only relayout when document or size changes
4. **Use requestAnimationFrame**: Don't block main thread
5. **Consider incremental layout**: Only relayout changed lines (advanced)

## Testing Your Layout Engine

```pseudo
// Test basic layout
doc = createDocument("Hello World")
layout = computeLayout(doc, 200, 100)
assert layout.lines.length == 1
assert layout.chars.length == 11

// Test line breaking
doc = createDocument("This is a very long sentence that should wrap to multiple lines")
layout = computeLayout(doc, 100, 200)
assert layout.lines.length > 1

// Test mixed styles
doc = createDocumentWithStyles("Hello", [
  { text: "Hel", fontSize: 32 },
  { text: "lo", fontSize: 16 }
])
layout = computeLayout(doc, 200, 100)
// Line height should be based on 32px font
assert layout.lines[0].height >= 32

// Test alignment
doc = createDocument("Hi")
doc.align = 'center'
layout = computeLayout(doc, 200, 100)
// "Hi" should be centered
assert layout.chars[0].x > 90  // Approximately centered
```

## Summary

The layout engine:
1. **Flattens** document to styled characters
2. **Tokenizes** into words/spaces/newlines
3. **Measures** each token using Canvas API
4. **Breaks lines** respecting container width
5. **Positions** each character precisely
6. **Applies** alignment and vertical positioning

This is complex but gives you complete control. Optimize hot paths and cache measurements for good performance.

## What's Next?

With the layout engine computing exact positions, [Part 3: Rendering Pipeline](./PART3_RENDERING.md) will show you how to:

- Draw characters to canvas with proper styles
- Handle device pixel ratio for sharp text
- Render decorations (underline, strikethrough)
- Draw backgrounds and effects
- Use offscreen canvas for performance

[Continue to Part 3 →](./PART3_RENDERING.md)
