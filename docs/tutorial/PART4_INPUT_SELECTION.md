# Part 4: Input Handling & Caret/Selection

Your text looks beautiful, but users can't interact with it. This part covers the most crucial aspect: making your editor respond to user input. No hidden textareas, no DOM tricks—pure event handling.

## The Input Challenge

You need to:
- Capture keyboard input
- Handle special keys (arrows, backspace, delete)
- Position caret on mouse click
- Support mouse drag selection
- Show visual feedback (caret blinking)
- Map between screen coordinates and document positions

## Understanding Selection

Text selection has two positions:

```pseudo
Selection = {
  anchor: number,  // Where selection started
  focus: number    // Where selection ends (cursor position)
}
```

When `anchor == focus`, there's no selection—just a caret (cursor).

```
The quick brown fox
    ^ anchor = focus = 4
    |
  Caret here (no selection)

The quick brown fox
    ^         ^
  anchor=4  focus=14
    |_________|
    Selection
```

## Event Flow Architecture

```
User Input (mouse/keyboard)
       ↓
[Konva Event] or [Window Event]
       ↓
[Event Handler in RichTextNode]
       ↓
[Update Document Model]
       ↓
[Update Selection]
       ↓
[Recalculate Layout]
       ↓
[Re-render]
       ↓
Visual Update
```

## Keyboard Input: The Global Listener Approach

Since we don't use DOM text fields, we need to capture keystrokes at the window level:

```pseudo
class RichTextNode:
  _isEditing: boolean
  _keydownHandler: function
  _keypressHandler: function

  function startEditing():
    this._isEditing = true

    // Attach global listeners
    this._keydownHandler = (e) => this.handleKeyDown(e)
    this._keypressHandler = (e) => this.handleKeyPress(e)

    window.addEventListener('keydown', this._keydownHandler)
    window.addEventListener('keypress', this._keypressHandler)

    // Start caret blinking
    this.startCaretBlink()

    // Emit event
    this.fire('editstart')

  function stopEditing():
    this._isEditing = false

    // Remove global listeners
    window.removeEventListener('keydown', this._keydownHandler)
    window.removeEventListener('keypress', this._keypressHandler)

    // Stop caret
    this.stopCaretBlink()

    this.fire('editend')
```

### Keydown vs Keypress

**Keydown**: Fires for ALL keys (including arrows, backspace, modifiers)
**Keypress**: Fires only for printable characters (deprecated in some browsers)

Modern approach: use `keydown` for everything:

```pseudo
function handleKeyDown(e):
  if not this._isEditing:
    return

  key = e.key

  // Handle control characters
  if key == 'Backspace':
    e.preventDefault()
    this.handleBackspace()
  else if key == 'Delete':
    e.preventDefault()
    this.handleDelete()
  else if key == 'Enter':
    e.preventDefault()
    this.handleEnter()
  else if key == 'ArrowLeft':
    e.preventDefault()
    this.handleArrowLeft(e.shiftKey)
  else if key == 'ArrowRight':
    e.preventDefault()
    this.handleArrowRight(e.shiftKey)
  else if key == 'ArrowUp':
    e.preventDefault()
    this.handleArrowUp(e.shiftKey)
  else if key == 'ArrowDown':
    e.preventDefault()
    this.handleArrowDown(e.shiftKey)
  else if e.ctrlKey or e.metaKey:  // Command on Mac
    this.handleControlKey(key, e)
  else if key.length == 1:  // Single character
    e.preventDefault()
    this.handleCharacterInput(key)
```

## Character Input

When user types a letter:

```pseudo
function handleCharacterInput(char):
  // Delete selected text first (if any)
  if hasSelection():
    this.deleteSelection()

  // Insert character at cursor
  this._document = insertText(
    this._document,
    this._selection.focus,
    char,
    this._currentStyle
  )

  // Move cursor forward
  this._selection = {
    anchor: this._selection.focus + 1,
    focus: this._selection.focus + 1
  }

  // Update display
  this.relayout()
  this.render()
```

### Current Style Tracking

When no text is selected, track the style for next character:

```pseudo
class RichTextNode:
  _currentStyle: TextStyle

  function updateCurrentStyle():
    if this.hasSelection():
      // Style of first character in selection
      start = min(this._selection.anchor, this._selection.focus)
      this._currentStyle = getStyleAtPosition(this._document, start)
    else:
      // Style at cursor position
      if this._selection.focus > 0:
        this._currentStyle = getStyleAtPosition(this._document, this._selection.focus - 1)
      else:
        this._currentStyle = DEFAULT_STYLE
```

## Backspace Handling

```pseudo
function handleBackspace():
  if hasSelection():
    this.deleteSelection()
  else if this._selection.focus > 0:
    // Delete character before cursor
    this._document = deleteRange(
      this._document,
      this._selection.focus - 1,
      this._selection.focus
    )

    // Move cursor back
    this._selection = {
      anchor: this._selection.focus - 1,
      focus: this._selection.focus - 1
    }

    this.relayout()
    this.render()
```

### Special Case: Backspace at List Item Start

```pseudo
function handleBackspace():
  // Check if at start of list item
  if isAtListItemStart(this._selection.focus, this._document):
    listItem = getCurrentLineListItem()

    if listItem.level > 0:
      // Outdent first
      this._document = outdentListItem(this._document, currentLine)
    else:
      // Remove list formatting
      this._document = removeListItem(this._document, currentLine)

    this.relayout()
    this.render()
    return

  // Normal backspace behavior...
```

## Arrow Key Navigation

### Left/Right Arrows

```pseudo
function handleArrowLeft(withShift):
  newFocus = this._selection.focus - 1
  if newFocus < 0:
    newFocus = 0

  if withShift:
    // Extend selection
    this._selection = {
      anchor: this._selection.anchor,  // Keep anchor
      focus: newFocus
    }
  else:
    // Move caret, collapse selection
    if hasSelection():
      // Jump to selection start
      newFocus = min(this._selection.anchor, this._selection.focus)

    this._selection = {
      anchor: newFocus,
      focus: newFocus
    }

  this.render()

function handleArrowRight(withShift):
  maxPos = getDocumentLength(this._document)
  newFocus = this._selection.focus + 1
  if newFocus > maxPos:
    newFocus = maxPos

  if withShift:
    this._selection = {
      anchor: this._selection.anchor,
      focus: newFocus
    }
  else:
    if hasSelection():
      newFocus = max(this._selection.anchor, this._selection.focus)

    this._selection = {
      anchor: newFocus,
      focus: newFocus
    }

  this.render()
```

### Up/Down Arrows (Line Navigation)

This is trickier—need to find corresponding position on adjacent line:

```pseudo
function handleArrowUp(withShift):
  currentCaretPos = getCaretPosition(this._layout, this._selection.focus, this._document)
  targetY = currentCaretPos.y - currentCaretPos.height

  // Find character at same X position but previous line
  newFocus = findPositionAtCoordinates(this._layout, currentCaretPos.x, targetY)

  if withShift:
    this._selection.focus = newFocus
  else:
    this._selection = { anchor: newFocus, focus: newFocus }

  this.render()

function findPositionAtCoordinates(layout, x, y):
  // Find the line at this Y position
  targetLine = null
  for each line in layout.lines:
    if y >= line.y and y < line.y + line.height:
      targetLine = line
      break

  if not targetLine:
    // Before first line or after last line
    if y < layout.lines[0].y:
      return 0
    else:
      return getDocumentLength(doc)

  // Find character at X position in this line
  for each char in targetLine.chars:
    if x >= char.x and x < char.x + char.width:
      // Should cursor be before or after this char?
      if x < char.x + (char.width / 2):
        return char.char.absoluteIndex
      else:
        return char.char.absoluteIndex + 1

  // X is past end of line
  if targetLine.chars.length > 0:
    lastChar = targetLine.chars[targetLine.chars.length - 1]
    return lastChar.char.absoluteIndex + 1
  else:
    return getLineStartPosition(doc, targetLine.lineIndex)
```

## Enter Key Handling

```pseudo
function handleEnter():
  // Delete selection if exists
  if hasSelection():
    this.deleteSelection()

  // Insert newline
  this._document = insertText(
    this._document,
    this._selection.focus,
    '\n',
    this._currentStyle
  )

  // Move cursor to next line
  this._selection = {
    anchor: this._selection.focus + 1,
    focus: this._selection.focus + 1
  }

  // Handle list continuation
  if currentLineIsList():
    if currentLineIsEmpty():
      // Exit list on empty Enter
      this._document = removeListItem(this._document, currentLine)
    else:
      // Continue list on next line
      this._document = addListItem(this._document, nextLine, currentListType)

  this.relayout()
  this.render()
```

## Keyboard Shortcuts

```pseudo
function handleControlKey(key, event):
  switch key.toLowerCase():
    case 'b':
      event.preventDefault()
      this.toggleBold()

    case 'i':
      event.preventDefault()
      this.toggleItalic()

    case 'u':
      event.preventDefault()
      this.toggleUnderline()

    case 'a':
      event.preventDefault()
      this.selectAll()

    case 'z':
      event.preventDefault()
      if event.shiftKey:
        this.redo()
      else:
        this.undo()

    case 'y':
      event.preventDefault()
      this.redo()

    case 'c':
      // Let browser handle copy
      // Or implement custom: this.handleCopy()

    case 'v':
      // Intercept paste
      event.preventDefault()
      this.handlePaste()

    case 'x':
      event.preventDefault()
      this.handleCut()
```

## Mouse Input: Click to Position Caret

### Double-Click to Edit

```pseudo
// In Konva setup
textNode.on('dblclick', (e) => {
  textNode.startEditing()
  // Also position caret at click location
  pos = textNode.getRelativePointerPosition()
  charIndex = hitTestPosition(textNode._layout, pos.x, pos.y)
  textNode.setCaretPosition(charIndex)
})
```

### Single Click During Editing

```pseudo
// During editing mode
textNode.on('click', (e) => {
  if not textNode._isEditing:
    return

  pos = textNode.getRelativePointerPosition()
  charIndex = hitTestPosition(textNode._layout, pos.x, pos.y)
  textNode.setCaretPosition(charIndex)
})
```

## Hit Testing: Screen → Document Position

This is the reverse of caret positioning. Given (x, y), find the character index:

```pseudo
function hitTestPosition(layout, x, y):
  // Find the line at this Y coordinate
  targetLine = null
  for each line in layout.lines:
    if y >= line.y and y < line.y + line.height:
      targetLine = line
      break

  // If clicked above first line
  if not targetLine and y < layout.lines[0].y:
    return 0

  // If clicked below last line
  if not targetLine:
    lastLine = layout.lines[layout.lines.length - 1]
    if lastLine.chars.length > 0:
      return lastLine.chars[lastLine.chars.length - 1].char.absoluteIndex + 1
    return getDocumentLength(doc)

  // Find character at X position within line
  if targetLine.chars.length == 0:
    // Empty line
    return getLineStartPosition(doc, targetLine.lineIndex)

  // Check each character
  for each char in targetLine.chars:
    charMidpoint = char.x + (char.width / 2)

    if x < charMidpoint:
      // Clicked before midpoint → position before this char
      return char.char.absoluteIndex

  // Clicked after all characters → position after last char
  lastChar = targetLine.chars[targetLine.chars.length - 1]
  return lastChar.char.absoluteIndex + 1
```

### Hit Testing with List Bullet Zone

```pseudo
function hitTestWithBulletZone(layout, x, y, doc):
  // First check if in bullet zone
  targetLine = findLineAtY(layout, y)

  if targetLine and targetLine.listItem:
    bulletZoneEnd = doc.padding + targetLine.listIndent
    if x < bulletZoneEnd:
      // Clicked in bullet zone - treat specially
      return {
        position: getLineStartPosition(doc, targetLine.lineIndex),
        inBulletZone: true
      }

  // Normal hit test
  position = hitTestPosition(layout, x, y)
  return { position: position, inBulletZone: false }
```

## Mouse Drag Selection

```pseudo
class RichTextNode:
  _isDragging: boolean
  _dragStartPosition: number

  function handleMouseDown(pos):
    if not this._isEditing:
      return

    charIndex = hitTestPosition(this._layout, pos.x, pos.y)

    this._isDragging = true
    this._dragStartPosition = charIndex

    // Set selection anchor
    this._selection = {
      anchor: charIndex,
      focus: charIndex
    }

    this.render()

  function handleMouseMove(pos):
    if not this._isDragging:
      return

    charIndex = hitTestPosition(this._layout, pos.x, pos.y)

    // Update selection focus (anchor stays fixed)
    this._selection = {
      anchor: this._dragStartPosition,
      focus: charIndex
    }

    this.render()

  function handleMouseUp():
    this._isDragging = false
```

### Konva Event Setup

```pseudo
textNode.on('mousedown', (e) => {
  pos = textNode.getRelativePointerPosition()
  textNode.handleMouseDown(pos)
})

// Need window-level for drag outside node bounds
window.addEventListener('mousemove', (e) => {
  if textNode._isDragging:
    // Convert screen coords to node coords
    pos = textNode.getRelativePointerPosition()
    textNode.handleMouseMove(pos)
})

window.addEventListener('mouseup', () => {
  textNode.handleMouseUp()
})
```

## Coordinate Transformations

When your text node is transformed (scaled, rotated), coordinates need conversion:

```pseudo
function getRelativePointerPosition():
  // Get stage pointer position
  stagePos = this.getStage().getPointerPosition()

  // Get node's absolute transform
  transform = this.getAbsoluteTransform().copy()
  transform.invert()

  // Convert to local coordinates
  localPos = transform.point(stagePos)

  return localPos
```

## Caret Blinking Animation

```pseudo
class RichTextNode:
  _caretBlinkInterval: number
  _caretVisible: boolean

  function startCaretBlink():
    this._caretVisible = true

    // Toggle visibility every 530ms (standard blink rate)
    this._caretBlinkInterval = setInterval(() => {
      this._caretVisible = !this._caretVisible
      this.render()
    }, 530)

  function stopCaretBlink():
    clearInterval(this._caretBlinkInterval)
    this._caretVisible = false
    this.render()

  function resetCaretBlink():
    // Reset blink on any input (caret stays visible)
    clearInterval(this._caretBlinkInterval)
    this._caretVisible = true
    this.render()
    this.startCaretBlink()
```

## Selection Helpers

```pseudo
function hasSelection():
  return this._selection.anchor != this._selection.focus

function getSelectionRange():
  return {
    start: min(this._selection.anchor, this._selection.focus),
    end: max(this._selection.anchor, this._selection.focus)
  }

function deleteSelection():
  if not hasSelection():
    return

  { start, end } = getSelectionRange()

  this._document = deleteRange(this._document, start, end)

  // Collapse selection to start
  this._selection = {
    anchor: start,
    focus: start
  }

  this.relayout()

function selectAll():
  this._selection = {
    anchor: 0,
    focus: getDocumentLength(this._document)
  }
  this.render()
```

## Word Selection (Double-Click)

Select entire word on double-click:

```pseudo
function selectWordAt(position):
  text = getDocumentText(this._document)

  // Find word boundaries
  wordStart = position
  wordEnd = position

  // Scan backwards to word start
  while wordStart > 0 and isWordChar(text[wordStart - 1]):
    wordStart--

  // Scan forwards to word end
  while wordEnd < text.length and isWordChar(text[wordEnd]):
    wordEnd++

  this._selection = {
    anchor: wordStart,
    focus: wordEnd
  }

  this.render()

function isWordChar(char):
  return /[a-zA-Z0-9_]/.test(char)
```

## Copy/Paste Handling

### Copy

```pseudo
function handleCopy():
  if not hasSelection():
    return

  { start, end } = getSelectionRange()
  text = getDocumentText(this._document)
  selectedText = text.substring(start, end)

  // Use Clipboard API
  navigator.clipboard.writeText(selectedText)

  // Or fallback to execCommand
  // textArea = document.createElement('textarea')
  // textArea.value = selectedText
  // document.body.appendChild(textArea)
  // textArea.select()
  // document.execCommand('copy')
  // document.body.removeChild(textArea)
```

### Paste

```pseudo
function handlePaste():
  navigator.clipboard.readText().then((text) => {
    if hasSelection():
      this.deleteSelection()

    // Insert pasted text with current style
    this._document = insertText(
      this._document,
      this._selection.focus,
      text,
      this._currentStyle
    )

    // Move cursor to end of pasted text
    newPos = this._selection.focus + text.length
    this._selection = { anchor: newPos, focus: newPos }

    this.relayout()
    this.render()
  })
```

### Rich Text Paste (Advanced)

```pseudo
// Store rich text in clipboard
function handleRichCopy():
  if not hasSelection():
    return

  { start, end } = getSelectionRange()

  // Extract styled segments
  segments = extractStyledSegments(this._document, start, end)

  // Plain text for fallback
  plainText = getDocumentText(this._document).substring(start, end)

  // Custom MIME type for rich data
  richData = JSON.stringify(segments)

  navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
      'application/x-rich-text': new Blob([richData], { type: 'application/json' })
    })
  ])

function handleRichPaste():
  navigator.clipboard.read().then((items) => {
    for each item in items:
      if item.types.includes('application/x-rich-text'):
        // Paste with formatting
        blob = item.getType('application/x-rich-text')
        blob.text().then((json) => {
          segments = JSON.parse(json)
          this.insertStyledSegments(segments)
        })
        return

    // Fallback to plain text
    this.handlePaste()
  })
```

## Edge Cases

### 1. Click Outside Text Bounds

```pseudo
function hitTestPosition(layout, x, y):
  // Clamp Y to valid range
  if y < layout.lines[0].y:
    y = layout.lines[0].y

  lastLine = layout.lines[layout.lines.length - 1]
  if y > lastLine.y + lastLine.height:
    y = lastLine.y + lastLine.height / 2

  // Now find position...
```

### 2. Empty Document

```pseudo
if layout.chars.length == 0:
  // Always return position 0
  return 0
```

### 3. Selection Across Multiple Lines

Works automatically with absolute positions!

### 4. Rapid Typing

```pseudo
// Debounce layout recalculation for performance
_layoutTimeout: number

function requestLayout():
  clearTimeout(this._layoutTimeout)
  this._layoutTimeout = setTimeout(() => {
    this.relayout()
    this.render()
  }, 0)  // Next tick
```

## Testing Input Handling

```pseudo
// Simulate typing
textNode.handleCharacterInput('H')
textNode.handleCharacterInput('e')
textNode.handleCharacterInput('l')
textNode.handleCharacterInput('l')
textNode.handleCharacterInput('o')
assert getDocumentText(textNode._document) == "Hello"

// Test backspace
textNode.handleBackspace()
assert getDocumentText(textNode._document) == "Hell"

// Test selection
textNode._selection = { anchor: 1, focus: 3 }
textNode.handleCharacterInput('X')
assert getDocumentText(textNode._document) == "HXl"

// Test arrow keys
textNode._selection = { anchor: 0, focus: 0 }
textNode.handleArrowRight(false)
assert textNode._selection.focus == 1

// Test click hit testing
pos = { x: 50, y: 20 }
charIndex = hitTestPosition(layout, pos.x, pos.y)
assert charIndex >= 0 and charIndex <= documentLength
```

## Summary

Input handling requires:

1. **Global keyboard listeners** when editing
2. **Keydown handler** for all keys (characters + special)
3. **Selection model** with anchor and focus
4. **Hit testing** to convert mouse coords to document positions
5. **Drag selection** with mouse events
6. **Caret blinking** for visual feedback
7. **Coordinate transforms** for transformed nodes
8. **Clipboard integration** for copy/paste

This is where your editor becomes interactive. The key insight: everything maps to document operations (insert, delete, move cursor).

## What's Next?

With basic editing working, [Part 5: Advanced Features](./PART5_ADVANCED.md) covers:

- Undo/Redo with history stack
- Lists (bullets and numbers)
- Style formatting commands
- Tab indentation
- Find and replace

[Continue to Part 5 →](./PART5_ADVANCED.md)
