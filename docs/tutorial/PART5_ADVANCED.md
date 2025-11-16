# Part 5: Advanced Features

With core editing working, let's add features that make your editor feel complete: undo/redo, lists, style toggles, and more. These transform a basic editor into something production-ready.

## Undo/Redo System

Users expect Ctrl+Z to work. Here's how to implement it properly.

### History Stack Architecture

```pseudo
HistoryEntry = {
  document: RichTextDocument,
  selection: Selection,
  timestamp: number
}

class HistoryManager:
  _history: HistoryEntry[]   // Past states
  _future: HistoryEntry[]    // States for redo
  _maxHistory: number        // Limit memory usage

  constructor():
    this._history = []
    this._future = []
    this._maxHistory = 100
```

### Saving State

```pseudo
function saveState(currentDoc, currentSelection):
  entry = {
    document: deepClone(currentDoc),  // Important: clone!
    selection: { ...currentSelection },
    timestamp: Date.now()
  }

  // Add to history
  this._history.push(entry)

  // Clear future (branching timeline)
  this._future = []

  // Limit history size
  if this._history.length > this._maxHistory:
    this._history.shift()  // Remove oldest
```

### When to Save

Don't save on every keystroke—too many entries! Batch similar operations:

```pseudo
class RichTextNode:
  _lastOperationType: string
  _lastSaveTime: number

  function performOperation(type):
    shouldSave = false

    // Save if operation type changed
    if type != this._lastOperationType:
      shouldSave = true

    // Save if enough time passed (1 second)
    if Date.now() - this._lastSaveTime > 1000:
      shouldSave = true

    // Always save before certain operations
    if type == 'style' or type == 'delete_range':
      shouldSave = true

    if shouldSave:
      this._history.saveState(this._document, this._selection)
      this._lastSaveTime = Date.now()

    this._lastOperationType = type

    // ... perform actual operation
```

### Operation Types

```pseudo
'insert_char'    // Typing
'delete_char'    // Backspace/Delete single char
'delete_range'   // Delete selection
'style'          // Format change
'list_toggle'    // Toggle list
'enter'          // New line
```

### Undo

```pseudo
function undo():
  if this._history.length == 0:
    return  // Nothing to undo

  // Save current state to future (for redo)
  currentState = {
    document: deepClone(this._document),
    selection: { ...this._selection },
    timestamp: Date.now()
  }
  this._future.push(currentState)

  // Restore previous state
  previousState = this._history.pop()
  this._document = previousState.document
  this._selection = previousState.selection

  this.relayout()
  this.render()
```

### Redo

```pseudo
function redo():
  if this._future.length == 0:
    return  // Nothing to redo

  // Save current to history
  currentState = {
    document: deepClone(this._document),
    selection: { ...this._selection },
    timestamp: Date.now()
  }
  this._history.push(currentState)

  // Restore future state
  futureState = this._future.pop()
  this._document = futureState.document
  this._selection = futureState.selection

  this.relayout()
  this.render()
```

### Deep Clone for Documents

Essential for undo—must clone, not reference:

```pseudo
function deepCloneDocument(doc):
  return {
    spans: doc.spans.map(span => ({
      id: span.id,
      text: span.text,
      style: { ...span.style }
    })),
    align: doc.align,
    verticalAlign: doc.verticalAlign,
    padding: doc.padding,
    listItems: new Map(doc.listItems)  // Clone the Map
  }
```

## Lists: Bullets and Numbers

Lists require coordination between:
- Document model (which lines are lists)
- Layout engine (indentation)
- Renderer (drawing markers)
- Input handler (special behavior)

### Toggle List on Current Line

```pseudo
function toggleBulletList():
  lineIndex = getCurrentLineIndex()

  if this._document.listItems.has(lineIndex):
    // Already a list - check type
    existingItem = this._document.listItems.get(lineIndex)

    if existingItem.type == 'bullet':
      // Remove list
      this._document = removeListItem(this._document, lineIndex)
    else:
      // Change to bullet
      this._document = setListType(this._document, lineIndex, 'bullet')
  else:
    // Add bullet list
    this._document = addListItem(this._document, lineIndex, 'bullet', 0)

  this._document = renumberLists(this._document)
  this.relayout()
  this.render()

function toggleNumberedList():
  lineIndex = getCurrentLineIndex()
  // Similar logic, but with 'number' type
```

### Add List Item

```pseudo
function addListItem(doc, lineIndex, type, level):
  newListItems = new Map(doc.listItems)

  newListItems.set(lineIndex, {
    type: type,
    level: level,
    index: 1  // Will be recalculated
  })

  return { ...doc, listItems: newListItems }
```

### Renumber Lists

After any list change, recalculate numbers:

```pseudo
function renumberLists(doc):
  newListItems = new Map()
  levelCounters = new Map()  // Track counter per nesting level
  lastLineIndex = -2

  for lineIndex from 0 to totalLines:
    item = doc.listItems.get(lineIndex)

    if not item:
      // Not a list line - reset counters
      levelCounters.clear()
      lastLineIndex = lineIndex
      continue

    // Check for gap (non-consecutive list lines)
    if lineIndex - lastLineIndex > 1:
      levelCounters.clear()

    // Reset deeper level counters when going up
    for each level in levelCounters.keys():
      if level > item.level:
        levelCounters.delete(level)

    // Get or initialize counter for this level
    currentCount = levelCounters.get(item.level) || 0
    currentCount++
    levelCounters.set(item.level, currentCount)

    // Update list item with new index
    newListItems.set(lineIndex, {
      ...item,
      index: currentCount
    })

    lastLineIndex = lineIndex

  return { ...doc, listItems: newListItems }
```

### List Indentation (Tab Key)

```pseudo
function handleTab():
  lineIndex = getCurrentLineIndex()

  if this._document.listItems.has(lineIndex):
    // Indent (increase level)
    this._document = indentListItem(this._document, lineIndex)
    this._document = renumberLists(this._document)
    this.relayout()
    this.render()
  else:
    // Insert tab character
    this.handleCharacterInput('\t')

function handleShiftTab():
  lineIndex = getCurrentLineIndex()

  if this._document.listItems.has(lineIndex):
    // Outdent (decrease level)
    this._document = outdentListItem(this._document, lineIndex)
    this._document = renumberLists(this._document)
    this.relayout()
    this.render()

function indentListItem(doc, lineIndex):
  item = doc.listItems.get(lineIndex)
  if item.level >= MAX_INDENT_LEVEL:
    return doc  // Don't indent beyond max

  newListItems = new Map(doc.listItems)
  newListItems.set(lineIndex, {
    ...item,
    level: item.level + 1
  })
  return { ...doc, listItems: newListItems }

function outdentListItem(doc, lineIndex):
  item = doc.listItems.get(lineIndex)
  if item.level <= 0:
    return doc  // Can't outdent further

  newListItems = new Map(doc.listItems)
  newListItems.set(lineIndex, {
    ...item,
    level: item.level - 1
  })
  return { ...doc, listItems: newListItems }
```

### Enter Key in Lists

```pseudo
function handleEnterInList():
  currentLine = getCurrentLineIndex()
  currentItem = this._document.listItems.get(currentLine)

  if isCurrentLineEmpty():
    // Empty list item - exit list
    this._document = removeListItem(this._document, currentLine)
  else:
    // Continue list on new line
    // Insert newline first
    this._document = insertText(this._document, this._selection.focus, '\n', this._currentStyle)
    this._selection.focus++
    this._selection.anchor = this._selection.focus

    // Add list item for new line
    nextLine = currentLine + 1
    this._document = addListItem(this._document, nextLine, currentItem.type, currentItem.level)

    // Shift all subsequent list items
    this._document = shiftListItemsDown(this._document, nextLine + 1)

  this._document = renumberLists(this._document)
  this.relayout()
  this.render()
```

### Shift List Items

When inserting/deleting lines, update line indices:

```pseudo
function shiftListItemsDown(doc, fromLine):
  // Shift all list items at fromLine and after by +1
  newListItems = new Map()

  for each [lineIndex, item] in doc.listItems:
    if lineIndex >= fromLine:
      newListItems.set(lineIndex + 1, item)
    else:
      newListItems.set(lineIndex, item)

  return { ...doc, listItems: newListItems }

function shiftListItemsUp(doc, fromLine):
  // Shift all list items at fromLine and after by -1
  newListItems = new Map()

  for each [lineIndex, item] in doc.listItems:
    if lineIndex >= fromLine:
      newListItems.set(lineIndex - 1, item)
    else:
      newListItems.set(lineIndex, item)

  return { ...doc, listItems: newListItems }
```

## Style Formatting Commands

### Toggle Bold

```pseudo
function toggleBold():
  if hasSelection():
    { start, end } = getSelectionRange()

    // Check if entire selection is bold
    isBold = isRangeBold(this._document, start, end)

    if isBold:
      this._document = applyStyle(this._document, start, end, { fontWeight: 'normal' })
    else:
      this._document = applyStyle(this._document, start, end, { fontWeight: 'bold' })

    this.relayout()
    this.render()
  else:
    // Toggle for next typed character
    if this._currentStyle.fontWeight == 'bold':
      this._currentStyle.fontWeight = 'normal'
    else:
      this._currentStyle.fontWeight = 'bold'
```

### Check if Range Has Style

```pseudo
function isRangeBold(doc, start, end):
  // Check every character in range
  chars = flattenToStyledChars(doc)

  for each char in chars:
    if char.absoluteIndex >= start and char.absoluteIndex < end:
      if char.style.fontWeight != 'bold':
        return false

  return true
```

### Apply Multiple Styles

```pseudo
function applyFormatting(styleUpdates):
  if hasSelection():
    { start, end } = getSelectionRange()
    this._document = applyStyle(this._document, start, end, styleUpdates)
    this.relayout()
    this.render()
  else:
    this._currentStyle = { ...this._currentStyle, ...styleUpdates }

// Usage:
textNode.applyFormatting({
  fontSize: 24,
  color: '#FF0000',
  underline: true
})
```

## Find and Replace

### Find Text

```pseudo
function findText(searchTerm):
  text = getDocumentText(this._document)
  matches = []

  index = 0
  while true:
    found = text.indexOf(searchTerm, index)
    if found == -1:
      break

    matches.push({
      start: found,
      end: found + searchTerm.length
    })
    index = found + 1

  return matches

function highlightMatches(matches):
  // Visual feedback - don't modify document
  this._highlightedMatches = matches
  this.render()

function goToNextMatch():
  // Move selection to next match
  currentPos = this._selection.focus

  for each match in this._highlightedMatches:
    if match.start > currentPos:
      this._selection = {
        anchor: match.start,
        focus: match.end
      }
      this.render()
      return

  // Wrap to first match
  if this._highlightedMatches.length > 0:
    firstMatch = this._highlightedMatches[0]
    this._selection = {
      anchor: firstMatch.start,
      focus: firstMatch.end
    }
    this.render()
```

### Replace

```pseudo
function replaceSelection(newText):
  if not hasSelection():
    return

  { start, end } = getSelectionRange()

  // Delete selected text
  this._document = deleteRange(this._document, start, end)

  // Insert replacement
  this._document = insertText(this._document, start, newText, this._currentStyle)

  // Position cursor after replacement
  newPos = start + newText.length
  this._selection = { anchor: newPos, focus: newPos }

  this.relayout()
  this.render()

function replaceAll(searchTerm, replacement):
  // Work backwards to maintain positions
  matches = findText(searchTerm)
  matches.reverse()

  for each match in matches:
    this._document = deleteRange(this._document, match.start, match.end)
    this._document = insertText(this._document, match.start, replacement, DEFAULT_STYLE)

  this.relayout()
  this.render()
```

## Text Statistics

```pseudo
function getStatistics():
  text = getDocumentText(this._document)

  return {
    characterCount: text.length,
    characterCountNoSpaces: text.replace(/\s/g, '').length,
    wordCount: countWords(text),
    lineCount: countLines(text),
    paragraphCount: countParagraphs(text)
  }

function countWords(text):
  if text.trim() == '':
    return 0

  // Split by whitespace and count non-empty
  words = text.trim().split(/\s+/)
  return words.length

function countLines(text):
  if text == '':
    return 1

  newlines = (text.match(/\n/g) || []).length
  return newlines + 1

function countParagraphs(text):
  // Paragraphs separated by blank lines
  paragraphs = text.split(/\n\s*\n/)
  return paragraphs.filter(p => p.trim().length > 0).length
```

## Spell Checking (Advanced)

```pseudo
class SpellChecker:
  _dictionary: Set<string>
  _misspelledWords: Array<{ word, start, end }>

  function checkDocument(doc):
    text = getDocumentText(doc)
    words = extractWordsWithPositions(text)
    this._misspelledWords = []

    for each { word, start, end } in words:
      if not this._dictionary.has(word.toLowerCase()):
        this._misspelledWords.push({ word, start, end })

    return this._misspelledWords

  function getSuggestions(word):
    // Simple: find similar words in dictionary
    suggestions = []

    for each dictWord in this._dictionary:
      if levenshteinDistance(word, dictWord) <= 2:
        suggestions.push(dictWord)

    return suggestions.slice(0, 5)

// Render misspelled words with underline
function renderSpellcheck(ctx, layout, misspelledWords):
  ctx.strokeStyle = '#FF0000'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 2])  // Dotted line

  for each misspelled in misspelledWords:
    // Find character positions
    chars = getCharsInRange(layout, misspelled.start, misspelled.end)
    // Draw wavy underline under chars
    drawWavyUnderline(ctx, chars)

  ctx.setLineDash([])  // Reset
```

## Auto-Save

```pseudo
class AutoSave:
  _saveInterval: number
  _isDirty: boolean
  _lastSavedDoc: RichTextDocument

  constructor():
    this._isDirty = false

    // Auto-save every 30 seconds
    this._saveInterval = setInterval(() => {
      if this._isDirty:
        this.saveToStorage()
    }, 30000)

  function markDirty():
    this._isDirty = true

  function saveToStorage():
    serialized = this.serializeDocument(this._document)
    localStorage.setItem('autosave', serialized)
    this._isDirty = false
    this._lastSavedDoc = deepClone(this._document)

  function loadFromStorage():
    saved = localStorage.getItem('autosave')
    if saved:
      return this.deserializeDocument(saved)
    return null

  function serializeDocument(doc):
    // Convert Map to array for JSON
    listItemsArray = Array.from(doc.listItems.entries())

    return JSON.stringify({
      spans: doc.spans,
      align: doc.align,
      verticalAlign: doc.verticalAlign,
      padding: doc.padding,
      listItems: listItemsArray
    })

  function deserializeDocument(json):
    data = JSON.parse(json)

    return {
      ...data,
      listItems: new Map(data.listItems)
    }
```

## Performance Considerations

### Lazy Layout Calculation

```pseudo
_layoutDirty: boolean
_cachedLayout: LayoutResult

function getLayout():
  if this._layoutDirty:
    this._cachedLayout = computeLayout(this._document, this.width(), this.height())
    this._layoutDirty = false

  return this._cachedLayout

function markLayoutDirty():
  this._layoutDirty = true

// Only recalculate when needed
function handleCharacterInput(char):
  // ... modify document
  this.markLayoutDirty()
  // Don't immediately recalculate
  this.requestRender()  // Render will call getLayout()
```

### Incremental Layout (Advanced)

Only re-layout affected lines:

```pseudo
function incrementalLayout(oldLayout, changeStart, changeEnd):
  // Find affected lines
  affectedLines = []
  for each line in oldLayout.lines:
    lineStart = getLineStartPosition(doc, line.lineIndex)
    lineEnd = getLineEndPosition(doc, line.lineIndex)

    if lineEnd >= changeStart and lineStart <= changeEnd:
      affectedLines.push(line.lineIndex)

  // Re-layout only affected lines
  // ... complex optimization
```

## Testing Advanced Features

```pseudo
// Test undo/redo
doc = createDocument("Hello")
history.saveState(doc, { anchor: 5, focus: 5 })

doc = insertText(doc, 5, " World")
history.saveState(doc, { anchor: 11, focus: 11 })

previousDoc = history.undo()
assert getDocumentText(previousDoc) == "Hello"

nextDoc = history.redo()
assert getDocumentText(nextDoc) == "Hello World"

// Test list numbering
doc = createDocument("A\nB\nC")
doc = addListItem(doc, 0, 'number', 0)
doc = addListItem(doc, 1, 'number', 0)
doc = addListItem(doc, 2, 'number', 0)
doc = renumberLists(doc)
assert doc.listItems.get(0).index == 1
assert doc.listItems.get(1).index == 2
assert doc.listItems.get(2).index == 3

// Test nested numbering
doc = addListItem(doc, 1, 'number', 1)  // Indent second item
doc = renumberLists(doc)
assert doc.listItems.get(1).index == 1  // Resets for nested level

// Test style toggle
doc = createDocument("Hello World")
assert not isRangeBold(doc, 0, 5)

doc = applyStyle(doc, 0, 5, { fontWeight: 'bold' })
assert isRangeBold(doc, 0, 5)
assert not isRangeBold(doc, 5, 11)
```

## Summary

Advanced features add:

1. **Undo/Redo**: History stack with proper state management
2. **Lists**: Bullet/numbered with nesting and renumbering
3. **Style Commands**: Toggle formatting with smart detection
4. **Find/Replace**: Search and bulk replace
5. **Statistics**: Character, word, line counts
6. **Auto-save**: Periodic persistence
7. **Performance**: Lazy calculation and caching

These features transform your editor from a demo into a usable tool. Each builds on the solid foundation of document model and layout engine.

## What's Next?

Finally, [Part 6: Integration & Polish](./PART6_INTEGRATION.md) covers:

- Wrapping everything as a Konva node
- Transformer integration
- Production optimization
- Testing strategies
- Common bugs and fixes

[Continue to Part 6 →](./PART6_INTEGRATION.md)
