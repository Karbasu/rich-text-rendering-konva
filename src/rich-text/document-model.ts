// ============================================================================
// Document Model Operations
// ============================================================================

import {
  RichTextDocument,
  TextSpan,
  TextStyle,
  Selection,
  StyledChar,
  AbsolutePosition,
  generateSpanId,
  DEFAULT_STYLE,
} from './types';

/**
 * Flatten document into array of styled characters
 */
export function flattenDocument(doc: RichTextDocument): StyledChar[] {
  const chars: StyledChar[] = [];
  let absoluteIndex = 0;

  for (const span of doc.spans) {
    for (let i = 0; i < span.text.length; i++) {
      chars.push({
        char: span.text[i],
        style: span.style,
        spanId: span.id,
        absoluteIndex,
      });
      absoluteIndex++;
    }
  }

  return chars;
}

/**
 * Get total character count in document
 */
export function getDocumentLength(doc: RichTextDocument): number {
  return doc.spans.reduce((sum, span) => sum + span.text.length, 0);
}

/**
 * Convert absolute position to span index and char offset
 */
export function absoluteToSpanPosition(
  doc: RichTextDocument,
  absolutePos: AbsolutePosition
): { spanIndex: number; charOffset: number } {
  // Handle empty document
  if (doc.spans.length === 0) {
    return { spanIndex: 0, charOffset: 0 };
  }

  let remaining = absolutePos;

  for (let i = 0; i < doc.spans.length; i++) {
    const spanLength = doc.spans[i].text.length;
    if (remaining <= spanLength) {
      return { spanIndex: i, charOffset: remaining };
    }
    remaining -= spanLength;
  }

  // Position at end of document
  const lastSpanIndex = doc.spans.length - 1;
  return {
    spanIndex: lastSpanIndex,
    charOffset: doc.spans[lastSpanIndex].text.length,
  };
}

/**
 * Convert span position to absolute position
 */
export function spanToAbsolutePosition(
  doc: RichTextDocument,
  spanIndex: number,
  charOffset: number
): AbsolutePosition {
  let absolutePos = 0;

  for (let i = 0; i < spanIndex && i < doc.spans.length; i++) {
    absolutePos += doc.spans[i].text.length;
  }

  return absolutePos + charOffset;
}

/**
 * Get style at a specific position
 */
export function getStyleAtPosition(
  doc: RichTextDocument,
  pos: AbsolutePosition
): TextStyle {
  if (doc.spans.length === 0) {
    return { ...DEFAULT_STYLE };
  }

  const { spanIndex, charOffset } = absoluteToSpanPosition(doc, pos);
  const span = doc.spans[spanIndex];

  // If at end of span and there's a next span, use next span's style
  if (charOffset === span.text.length && spanIndex < doc.spans.length - 1) {
    return { ...doc.spans[spanIndex + 1].style };
  }

  return { ...span.style };
}

/**
 * Insert text at a specific position
 */
export function insertText(
  doc: RichTextDocument,
  pos: AbsolutePosition,
  text: string,
  style?: Partial<TextStyle>
): RichTextDocument {
  if (text.length === 0) return doc;

  // Handle empty spans array
  if (doc.spans.length === 0) {
    const newStyle = style ? { ...DEFAULT_STYLE, ...style } : { ...DEFAULT_STYLE };
    return {
      ...doc,
      spans: [
        {
          id: generateSpanId(),
          text,
          style: newStyle,
        },
      ],
    };
  }

  const { spanIndex, charOffset } = absoluteToSpanPosition(doc, pos);
  const newSpans = [...doc.spans];
  const currentSpan = newSpans[spanIndex];

  // Determine style to use
  const insertStyle = style
    ? { ...currentSpan.style, ...style }
    : { ...currentSpan.style };

  // Check if style matches current span
  const stylesMatch =
    !style ||
    Object.keys(style).every(
      (key) =>
        insertStyle[key as keyof TextStyle] ===
        currentSpan.style[key as keyof TextStyle]
    );

  if (stylesMatch) {
    // Insert into current span
    const newText =
      currentSpan.text.slice(0, charOffset) +
      text +
      currentSpan.text.slice(charOffset);

    newSpans[spanIndex] = {
      ...currentSpan,
      text: newText,
    };
  } else {
    // Need to split span and insert new one
    const beforeText = currentSpan.text.slice(0, charOffset);
    const afterText = currentSpan.text.slice(charOffset);

    const newSpansArray: TextSpan[] = [];

    // Before part (if any)
    if (beforeText.length > 0) {
      newSpansArray.push({
        ...currentSpan,
        text: beforeText,
      });
    }

    // New text with new style
    newSpansArray.push({
      id: generateSpanId(),
      text,
      style: insertStyle,
    });

    // After part (if any)
    if (afterText.length > 0) {
      newSpansArray.push({
        id: generateSpanId(),
        text: afterText,
        style: currentSpan.style,
      });
    }

    newSpans.splice(spanIndex, 1, ...newSpansArray);
  }

  return {
    ...doc,
    spans: normalizeSpans(newSpans),
  };
}

/**
 * Delete text in a range
 */
export function deleteRange(
  doc: RichTextDocument,
  start: AbsolutePosition,
  end: AbsolutePosition
): RichTextDocument {
  if (start >= end) return doc;

  const chars = flattenDocument(doc);
  const newChars = [...chars.slice(0, start), ...chars.slice(end)];

  return rebuildDocumentFromChars(doc, newChars);
}

/**
 * Apply style to a range of text
 */
export function applyStyleToRange(
  doc: RichTextDocument,
  start: AbsolutePosition,
  end: AbsolutePosition,
  style: Partial<TextStyle>
): RichTextDocument {
  if (start >= end) return doc;

  const chars = flattenDocument(doc);

  // Apply style to characters in range
  for (let i = start; i < end && i < chars.length; i++) {
    chars[i] = {
      ...chars[i],
      style: { ...chars[i].style, ...style },
    };
  }

  return rebuildDocumentFromChars(doc, chars);
}

/**
 * Toggle a boolean style property in a range
 */
export function toggleStyleInRange(
  doc: RichTextDocument,
  start: AbsolutePosition,
  end: AbsolutePosition,
  property: 'underline' | 'strikethrough'
): RichTextDocument {
  if (start >= end) return doc;

  const chars = flattenDocument(doc);

  // Check if all characters in range have the property set
  let allHaveProperty = true;
  for (let i = start; i < end && i < chars.length; i++) {
    if (!chars[i].style[property]) {
      allHaveProperty = false;
      break;
    }
  }

  // Toggle based on current state
  const newValue = !allHaveProperty;

  return applyStyleToRange(doc, start, end, { [property]: newValue });
}

/**
 * Toggle bold style in range
 */
export function toggleBoldInRange(
  doc: RichTextDocument,
  start: AbsolutePosition,
  end: AbsolutePosition
): RichTextDocument {
  if (start >= end) return doc;

  const chars = flattenDocument(doc);

  // Check if all characters in range are bold
  let allBold = true;
  for (let i = start; i < end && i < chars.length; i++) {
    if (chars[i].style.fontWeight !== 'bold' && chars[i].style.fontWeight !== 700) {
      allBold = false;
      break;
    }
  }

  const newWeight = allBold ? 'normal' : 'bold';

  return applyStyleToRange(doc, start, end, { fontWeight: newWeight });
}

/**
 * Toggle italic style in range
 */
export function toggleItalicInRange(
  doc: RichTextDocument,
  start: AbsolutePosition,
  end: AbsolutePosition
): RichTextDocument {
  if (start >= end) return doc;

  const chars = flattenDocument(doc);

  // Check if all characters in range are italic
  let allItalic = true;
  for (let i = start; i < end && i < chars.length; i++) {
    if (chars[i].style.fontStyle !== 'italic') {
      allItalic = false;
      break;
    }
  }

  const newStyle = allItalic ? 'normal' : 'italic';

  return applyStyleToRange(doc, start, end, { fontStyle: newStyle });
}

/**
 * Rebuild document from array of styled characters
 */
function rebuildDocumentFromChars(
  originalDoc: RichTextDocument,
  chars: StyledChar[]
): RichTextDocument {
  if (chars.length === 0) {
    // Keep at least one empty span
    return {
      ...originalDoc,
      spans: [
        {
          id: generateSpanId(),
          text: '',
          style: originalDoc.spans[0]?.style || { ...DEFAULT_STYLE },
        },
      ],
    };
  }

  const spans: TextSpan[] = [];
  let currentSpan: TextSpan | null = null;

  for (const char of chars) {
    if (!currentSpan || !stylesEqual(currentSpan.style, char.style)) {
      // Start new span
      if (currentSpan) {
        spans.push(currentSpan);
      }
      currentSpan = {
        id: generateSpanId(),
        text: char.char,
        style: char.style,
      };
    } else {
      // Add to current span
      currentSpan.text += char.char;
    }
  }

  if (currentSpan) {
    spans.push(currentSpan);
  }

  return {
    ...originalDoc,
    spans: normalizeSpans(spans),
  };
}

/**
 * Check if two styles are equal
 */
function stylesEqual(a: TextStyle, b: TextStyle): boolean {
  return (
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.letterSpacing === b.letterSpacing &&
    a.lineHeight === b.lineHeight &&
    JSON.stringify(a.stroke) === JSON.stringify(b.stroke) &&
    JSON.stringify(a.shadow) === JSON.stringify(b.shadow)
  );
}

/**
 * Normalize spans by merging adjacent spans with same style
 */
function normalizeSpans(spans: TextSpan[]): TextSpan[] {
  if (spans.length === 0) {
    return [
      {
        id: generateSpanId(),
        text: '',
        style: { ...DEFAULT_STYLE },
      },
    ];
  }

  const normalized: TextSpan[] = [];
  let current = spans[0];

  for (let i = 1; i < spans.length; i++) {
    const next = spans[i];

    if (stylesEqual(current.style, next.style)) {
      // Merge spans
      current = {
        ...current,
        text: current.text + next.text,
      };
    } else {
      normalized.push(current);
      current = next;
    }
  }

  normalized.push(current);

  // Remove empty spans except if it's the only one
  const nonEmpty = normalized.filter((s) => s.text.length > 0);
  if (nonEmpty.length === 0) {
    return [normalized[0] || { id: generateSpanId(), text: '', style: { ...DEFAULT_STYLE } }];
  }

  return nonEmpty;
}

/**
 * Get selected text as plain string
 */
export function getSelectedText(
  doc: RichTextDocument,
  selection: Selection
): string {
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);

  const chars = flattenDocument(doc);
  return chars
    .slice(start, end)
    .map((c) => c.char)
    .join('');
}

/**
 * Replace selected text with new text
 */
export function replaceSelection(
  doc: RichTextDocument,
  selection: Selection,
  newText: string,
  style?: Partial<TextStyle>
): { doc: RichTextDocument; newPosition: AbsolutePosition } {
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);

  // Delete selected text
  let newDoc = deleteRange(doc, start, end);

  // Insert new text
  if (newText.length > 0) {
    newDoc = insertText(newDoc, start, newText, style);
  }

  return {
    doc: newDoc,
    newPosition: start + newText.length,
  };
}

/**
 * Clone a document (deep copy)
 */
export function cloneDocument(doc: RichTextDocument): RichTextDocument {
  // Deep clone listItems Map
  const clonedListItems = new Map<number, import('./types').ListItem>();
  if (doc.listItems) {
    doc.listItems.forEach((value, key) => {
      clonedListItems.set(key, { ...value });
    });
  }

  return {
    ...doc,
    spans: doc.spans.map((span) => ({
      ...span,
      style: { ...span.style },
    })),
    listItems: clonedListItems,
  };
}

/**
 * Get line index for a given absolute position
 */
export function getLineIndexForPosition(
  doc: RichTextDocument,
  pos: AbsolutePosition
): number {
  const chars = flattenDocument(doc);
  let lineIndex = 0;

  for (let i = 0; i < pos && i < chars.length; i++) {
    if (chars[i].char === '\n') {
      lineIndex++;
    }
  }

  return lineIndex;
}

/**
 * Get the range of lines that contain the selection
 */
export function getSelectedLineRange(
  doc: RichTextDocument,
  selection: Selection
): { startLine: number; endLine: number } {
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);

  const startLine = getLineIndexForPosition(doc, start);
  const endLine = getLineIndexForPosition(doc, end);

  return { startLine, endLine };
}

/**
 * Toggle list type for selected lines
 */
export function toggleListForLines(
  doc: RichTextDocument,
  startLine: number,
  endLine: number,
  listType: 'bullet' | 'number'
): RichTextDocument {
  const newListItems = new Map(doc.listItems);

  // Check if all lines already have this list type
  let allHaveType = true;
  for (let i = startLine; i <= endLine; i++) {
    const item = newListItems.get(i);
    if (!item || item.type !== listType) {
      allHaveType = false;
      break;
    }
  }

  if (allHaveType) {
    // Remove list formatting
    for (let i = startLine; i <= endLine; i++) {
      newListItems.delete(i);
    }
  } else {
    // Apply list formatting
    let numberIndex = 1;

    // Find the starting number by looking at previous list items
    if (listType === 'number' && startLine > 0) {
      const prevItem = newListItems.get(startLine - 1);
      if (prevItem && prevItem.type === 'number') {
        numberIndex = prevItem.index + 1;
      }
    }

    for (let i = startLine; i <= endLine; i++) {
      newListItems.set(i, {
        type: listType,
        level: 0,
        index: listType === 'number' ? numberIndex++ : 0,
      });
    }

    // Update subsequent numbered list items
    if (listType === 'number') {
      let idx = numberIndex;
      for (let i = endLine + 1; ; i++) {
        const item = newListItems.get(i);
        if (!item || item.type !== 'number') break;
        newListItems.set(i, { ...item, index: idx++ });
      }
    }
  }

  return {
    ...doc,
    listItems: newListItems,
  };
}

/**
 * Indent list item (increase level)
 */
export function indentListItem(
  doc: RichTextDocument,
  lineIndex: number
): RichTextDocument {
  const item = doc.listItems.get(lineIndex);
  if (!item) return doc;

  const newListItems = new Map(doc.listItems);
  newListItems.set(lineIndex, {
    ...item,
    level: Math.min(item.level + 1, 5), // Max 5 levels
  });

  return {
    ...doc,
    listItems: newListItems,
  };
}

/**
 * Outdent list item (decrease level)
 */
export function outdentListItem(
  doc: RichTextDocument,
  lineIndex: number
): RichTextDocument {
  const item = doc.listItems.get(lineIndex);
  if (!item) return doc;

  const newListItems = new Map(doc.listItems);

  if (item.level === 0) {
    // Remove list formatting entirely
    newListItems.delete(lineIndex);
  } else {
    newListItems.set(lineIndex, {
      ...item,
      level: item.level - 1,
    });
  }

  return {
    ...doc,
    listItems: newListItems,
  };
}

/**
 * Remove list item and shift subsequent items up
 */
export function removeListItemAtLine(
  doc: RichTextDocument,
  lineIndex: number
): RichTextDocument {
  const newListItems = new Map<number, import('./types').ListItem>();

  // Shift all items, removing the one at lineIndex
  doc.listItems.forEach((item, idx) => {
    if (idx < lineIndex) {
      newListItems.set(idx, item);
    } else if (idx > lineIndex) {
      newListItems.set(idx - 1, item);
    }
    // Skip idx === lineIndex (remove it)
  });

  return {
    ...doc,
    listItems: newListItems,
  };
}

/**
 * Renumber all ordered lists to ensure consecutive numbering
 */
export function renumberLists(doc: RichTextDocument): RichTextDocument {
  const newListItems = new Map(doc.listItems);

  // Group consecutive numbered list items by level
  const sortedLines = Array.from(newListItems.keys()).sort((a, b) => a - b);

  // Track current number for each level
  const levelCounters = new Map<number, number>();

  for (const lineIdx of sortedLines) {
    const item = newListItems.get(lineIdx);
    if (!item || item.type !== 'number') {
      // Reset counters when we hit non-numbered items
      levelCounters.clear();
      continue;
    }

    // Get or initialize counter for this level
    const currentCount = levelCounters.get(item.level) || 0;
    const newCount = currentCount + 1;
    levelCounters.set(item.level, newCount);

    // Reset deeper level counters
    for (const [level] of levelCounters) {
      if (level > item.level) {
        levelCounters.delete(level);
      }
    }

    // Update the item with correct number
    if (item.index !== newCount) {
      newListItems.set(lineIdx, {
        ...item,
        index: newCount,
      });
    }
  }

  return {
    ...doc,
    listItems: newListItems,
  };
}

/**
 * Check if a line is empty (only contains whitespace or nothing)
 */
export function isLineEmpty(doc: RichTextDocument, lineIndex: number): boolean {
  const chars = flattenDocument(doc);
  let currentLine = 0;
  let lineStart = 0;
  let lineEnd = 0;

  for (let i = 0; i <= chars.length; i++) {
    if (i === chars.length || chars[i].char === '\n') {
      if (currentLine === lineIndex) {
        lineEnd = i;
        break;
      }
      currentLine++;
      lineStart = i + 1;
    }
  }

  // Check if line has any non-whitespace content
  for (let i = lineStart; i < lineEnd; i++) {
    const char = chars[i].char;
    if (char !== ' ' && char !== '\t') {
      return false;
    }
  }

  return true;
}

/**
 * Get start position of a line
 */
export function getLineStartPosition(
  doc: RichTextDocument,
  lineIndex: number
): AbsolutePosition {
  const chars = flattenDocument(doc);
  let currentLine = 0;
  let position = 0;

  for (let i = 0; i < chars.length; i++) {
    if (currentLine === lineIndex) {
      return position;
    }
    if (chars[i].char === '\n') {
      currentLine++;
    }
    position++;
  }

  return position;
}
