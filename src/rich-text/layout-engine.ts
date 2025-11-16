// ============================================================================
// Layout Engine - Tokenization, Line Breaking, and Text Positioning
// ============================================================================

import {
  RichTextDocument,
  TextStyle,
  StyledChar,
  LayoutToken,
  PositionedChar,
  LayoutLine,
  LayoutResult,
  TextAlign,
  AbsolutePosition,
} from './types';
import { flattenDocument } from './document-model';

/**
 * Text measurement cache for performance
 */
const measurementCache = new Map<string, number>();

/**
 * Offscreen canvas for text measurement
 */
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

/**
 * Initialize measurement canvas
 */
function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCanvas.width = 1;
    measureCanvas.height = 1;
    measureCtx = measureCanvas.getContext('2d')!;
  }
  return measureCtx!;
}

/**
 * Build font string from style
 */
export function buildFontString(style: TextStyle): string {
  const weight =
    typeof style.fontWeight === 'number'
      ? style.fontWeight
      : style.fontWeight === 'bold'
      ? 700
      : 400;

  return `${style.fontStyle} ${weight} ${style.fontSize}px ${style.fontFamily}`;
}

/**
 * Get cache key for measurement
 */
function getMeasurementCacheKey(char: string, style: TextStyle): string {
  return `${char}|${buildFontString(style)}|${style.letterSpacing}`;
}

/**
 * Measure width of a single character
 */
export function measureChar(char: string, style: TextStyle): number {
  const cacheKey = getMeasurementCacheKey(char, style);

  if (measurementCache.has(cacheKey)) {
    return measurementCache.get(cacheKey)!;
  }

  const ctx = getMeasureContext();
  ctx.font = buildFontString(style);

  const width = ctx.measureText(char).width + style.letterSpacing;

  measurementCache.set(cacheKey, width);

  return width;
}

/**
 * Get font metrics (ascent, descent, height)
 */
export function getFontMetrics(style: TextStyle): {
  ascent: number;
  descent: number;
  height: number;
} {
  const ctx = getMeasureContext();
  ctx.font = buildFontString(style);

  const metrics = ctx.measureText('Mg');
  const ascent = metrics.actualBoundingBoxAscent || style.fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent || style.fontSize * 0.2;
  const height = ascent + descent;

  return { ascent, descent, height };
}

/**
 * Tokenize styled characters into words, whitespace, and newlines
 */
export function tokenize(chars: StyledChar[]): LayoutToken[] {
  const tokens: LayoutToken[] = [];
  let currentToken: StyledChar[] = [];
  let currentType: 'word' | 'whitespace' | 'newline' = 'word';

  const pushToken = () => {
    if (currentToken.length > 0) {
      const width = currentToken.reduce(
        (sum, c) => sum + measureChar(c.char, c.style),
        0
      );
      tokens.push({
        chars: currentToken,
        width,
        type: currentType,
      });
      currentToken = [];
    }
  };

  for (const char of chars) {
    if (char.char === '\n') {
      pushToken();
      tokens.push({
        chars: [char],
        width: 0,
        type: 'newline',
      });
      currentType = 'word';
    } else if (char.char === ' ' || char.char === '\t') {
      if (currentType !== 'whitespace') {
        pushToken();
        currentType = 'whitespace';
      }
      currentToken.push(char);
    } else {
      if (currentType !== 'word') {
        pushToken();
        currentType = 'word';
      }
      currentToken.push(char);
    }
  }

  pushToken();

  return tokens;
}

/**
 * Calculate line height based on characters in the line
 */
function calculateLineMetrics(chars: StyledChar[]): {
  height: number;
  baseline: number;
  maxLineHeight: number;
} {
  if (chars.length === 0) {
    // Default metrics for empty line
    const defaultMetrics = getFontMetrics({
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000',
      underline: false,
      strikethrough: false,
      letterSpacing: 0,
      lineHeight: 1.4,
    });
    return {
      height: defaultMetrics.height * 1.4,
      baseline: defaultMetrics.ascent * 1.4,
      maxLineHeight: 1.4,
    };
  }

  let maxAscent = 0;
  let maxDescent = 0;
  let maxLineHeight = 1.4;

  for (const char of chars) {
    const metrics = getFontMetrics(char.style);
    const lineHeightMultiplier = char.style.lineHeight;
    const scaledAscent = metrics.ascent * lineHeightMultiplier;
    const scaledDescent = metrics.descent * lineHeightMultiplier;

    maxAscent = Math.max(maxAscent, scaledAscent);
    maxDescent = Math.max(maxDescent, scaledDescent);
    maxLineHeight = Math.max(maxLineHeight, lineHeightMultiplier);
  }

  return {
    height: maxAscent + maxDescent,
    baseline: maxAscent,
    maxLineHeight,
  };
}

/**
 * Main layout algorithm: break text into lines and position characters
 */
export function layoutText(
  doc: RichTextDocument,
  containerWidth: number,
  containerHeight: number
): LayoutResult {
  const chars = flattenDocument(doc);
  const tokens = tokenize(chars);
  const availableWidth = containerWidth - doc.padding * 2;

  const lines: LayoutLine[] = [];
  let currentLineChars: StyledChar[] = [];
  let currentLineWidth = 0;
  let currentY = doc.padding;

  const finalizeLine = (isLastLine: boolean = false) => {
    if (currentLineChars.length === 0) {
      // Empty line (from newline character)
      const metrics = calculateLineMetrics([]);
      lines.push({
        chars: [],
        y: currentY,
        height: metrics.height,
        baseline: metrics.baseline,
        width: 0,
        lineIndex: lines.length,
      });
      currentY += metrics.height;
    } else {
      const metrics = calculateLineMetrics(currentLineChars);
      const positionedChars = positionCharsInLine(
        currentLineChars,
        doc.align,
        availableWidth,
        currentLineWidth,
        doc.padding,
        currentY,
        metrics.baseline,
        lines.length,
        isLastLine
      );

      lines.push({
        chars: positionedChars,
        y: currentY,
        height: metrics.height,
        baseline: metrics.baseline,
        width: currentLineWidth,
        lineIndex: lines.length,
      });

      currentY += metrics.height;
    }

    currentLineChars = [];
    currentLineWidth = 0;
  };

  // Process tokens and break into lines
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'newline') {
      finalizeLine();
      continue;
    }

    // Check if token fits on current line
    if (currentLineWidth + token.width <= availableWidth || currentLineChars.length === 0) {
      // Token fits or line is empty
      currentLineChars.push(...token.chars);
      currentLineWidth += token.width;
    } else {
      // Need to wrap
      if (token.type === 'whitespace') {
        // Don't start new line with whitespace
        finalizeLine();
      } else {
        // Word doesn't fit - wrap
        finalizeLine();
        currentLineChars.push(...token.chars);
        currentLineWidth = token.width;
      }
    }
  }

  // Finalize last line
  if (currentLineChars.length > 0 || lines.length === 0) {
    finalizeLine(true);
  }

  // Apply vertical alignment
  const totalTextHeight = currentY - doc.padding;
  let verticalOffset = 0;

  if (doc.verticalAlign === 'middle') {
    verticalOffset = (containerHeight - totalTextHeight - doc.padding) / 2;
  } else if (doc.verticalAlign === 'bottom') {
    verticalOffset = containerHeight - totalTextHeight - doc.padding * 2;
  }

  if (verticalOffset > 0) {
    for (const line of lines) {
      line.y += verticalOffset;
      for (const char of line.chars) {
        char.y += verticalOffset;
      }
    }
  }

  // Flatten all positioned chars
  const allChars: PositionedChar[] = [];
  for (const line of lines) {
    allChars.push(...line.chars);
  }

  return {
    lines,
    width: containerWidth,
    height: containerHeight,
    chars: allChars,
  };
}

/**
 * Position characters within a line based on alignment
 */
function positionCharsInLine(
  chars: StyledChar[],
  align: TextAlign,
  availableWidth: number,
  lineWidth: number,
  padding: number,
  lineY: number,
  baseline: number,
  lineIndex: number,
  isLastLine: boolean
): PositionedChar[] {
  const positioned: PositionedChar[] = [];

  // Calculate starting X based on alignment
  let startX = padding;
  let extraSpacing = 0;
  let spaceCount = 0;

  if (align === 'center') {
    startX = padding + (availableWidth - lineWidth) / 2;
  } else if (align === 'right') {
    startX = padding + availableWidth - lineWidth;
  } else if (align === 'justify' && !isLastLine && chars.length > 1) {
    // Count spaces for justification
    for (const char of chars) {
      if (char.char === ' ') spaceCount++;
    }
    if (spaceCount > 0) {
      extraSpacing = (availableWidth - lineWidth) / spaceCount;
    }
  }

  let currentX = startX;

  for (const char of chars) {
    const charWidth = measureChar(char.char, char.style);
    const metrics = getFontMetrics(char.style);

    positioned.push({
      char,
      x: currentX,
      y: lineY,
      width: charWidth,
      height: metrics.height * char.style.lineHeight,
      baseline,
      lineIndex,
    });

    currentX += charWidth;

    // Add extra spacing for justify alignment
    if (align === 'justify' && char.char === ' ') {
      currentX += extraSpacing;
    }
  }

  return positioned;
}

/**
 * Get caret position for a given absolute index
 */
export function getCaretPosition(
  layout: LayoutResult,
  absoluteIndex: number,
  doc: RichTextDocument
): { x: number; y: number; height: number } {
  const padding = doc.padding;

  if (layout.chars.length === 0) {
    // Empty document
    const defaultMetrics = getFontMetrics({
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000',
      underline: false,
      strikethrough: false,
      letterSpacing: 0,
      lineHeight: 1.4,
    });

    return {
      x: padding,
      y: padding,
      height: defaultMetrics.height * 1.4,
    };
  }

  // Find character at or before the absolute index
  if (absoluteIndex === 0) {
    const firstChar = layout.chars[0];
    return {
      x: firstChar.x,
      y: firstChar.y,
      height: firstChar.height,
    };
  }

  // Find the character just before the caret position
  for (let i = 0; i < layout.chars.length; i++) {
    if (layout.chars[i].char.absoluteIndex === absoluteIndex - 1) {
      const char = layout.chars[i];
      return {
        x: char.x + char.width,
        y: char.y,
        height: char.height,
      };
    }
  }

  // Caret is at the end
  const lastChar = layout.chars[layout.chars.length - 1];
  return {
    x: lastChar.x + lastChar.width,
    y: lastChar.y,
    height: lastChar.height,
  };
}

/**
 * Hit test: find character index at a given coordinate
 */
export function hitTest(
  layout: LayoutResult,
  x: number,
  y: number,
  _doc: RichTextDocument
): AbsolutePosition {
  if (layout.lines.length === 0 || layout.chars.length === 0) {
    return 0;
  }

  // Find the line
  let targetLine: LayoutLine | null = null;

  for (const line of layout.lines) {
    if (y >= line.y && y < line.y + line.height) {
      targetLine = line;
      break;
    }
  }

  // If click is above first line
  if (!targetLine && y < layout.lines[0].y) {
    targetLine = layout.lines[0];
  }

  // If click is below last line
  if (!targetLine) {
    targetLine = layout.lines[layout.lines.length - 1];
  }

  // If line is empty, return position at start of next content
  if (targetLine.chars.length === 0) {
    // Find the first char after this line
    const lineIndex = targetLine.lineIndex;
    for (const char of layout.chars) {
      if (char.lineIndex > lineIndex) {
        return char.char.absoluteIndex;
      }
    }
    // Return end of document
    return layout.chars.length > 0
      ? layout.chars[layout.chars.length - 1].char.absoluteIndex + 1
      : 0;
  }

  // Find character in line
  for (const char of targetLine.chars) {
    const charMidpoint = char.x + char.width / 2;
    if (x < charMidpoint) {
      return char.char.absoluteIndex;
    }
  }

  // Click is after last character in line
  const lastCharInLine = targetLine.chars[targetLine.chars.length - 1];
  return lastCharInLine.char.absoluteIndex + 1;
}

/**
 * Get selection boxes for visual rendering
 */
export function getSelectionBoxes(
  layout: LayoutResult,
  start: AbsolutePosition,
  end: AbsolutePosition
): { x: number; y: number; width: number; height: number }[] {
  if (start >= end || layout.chars.length === 0) {
    return [];
  }

  const boxes: { x: number; y: number; width: number; height: number }[] = [];

  // Group selected characters by line
  const lineSelections = new Map<
    number,
    { minX: number; maxX: number; y: number; height: number }
  >();

  for (const char of layout.chars) {
    const charIndex = char.char.absoluteIndex;
    if (charIndex >= start && charIndex < end) {
      const lineIndex = char.lineIndex;

      if (!lineSelections.has(lineIndex)) {
        lineSelections.set(lineIndex, {
          minX: char.x,
          maxX: char.x + char.width,
          y: char.y,
          height: char.height,
        });
      } else {
        const sel = lineSelections.get(lineIndex)!;
        sel.minX = Math.min(sel.minX, char.x);
        sel.maxX = Math.max(sel.maxX, char.x + char.width);
        sel.height = Math.max(sel.height, char.height);
      }
    }
  }

  // Convert to boxes
  for (const sel of lineSelections.values()) {
    boxes.push({
      x: sel.minX,
      y: sel.y,
      width: sel.maxX - sel.minX,
      height: sel.height,
    });
  }

  return boxes;
}

/**
 * Clear measurement cache (useful when fonts change)
 */
export function clearMeasurementCache(): void {
  measurementCache.clear();
}
