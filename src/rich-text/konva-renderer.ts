// ============================================================================
// Konva-based Renderer - Uses native Konva nodes instead of canvas image
// ============================================================================

import Konva from 'konva';
import {
  LayoutResult,
  RichTextDocument,
  Selection,
  CaretInfo,
  PositionedChar,
  LayoutLine,
} from './types';

/**
 * Create Konva nodes for rendering rich text
 * Returns a group containing all text, selection, and caret nodes
 */
export function createKonvaTextNodes(
  layout: LayoutResult,
  doc: RichTextDocument,
  selection: Selection | null,
  caretInfo: CaretInfo | null,
  caretVisible: boolean
): Konva.Group {
  const group = new Konva.Group();

  // 1. Render selection highlights (behind text)
  if (selection && selection.anchor !== selection.focus) {
    const selectionGroup = createSelectionNodes(layout, selection);
    group.add(selectionGroup);
  }

  // 2. Render text background highlights
  const highlightGroup = createHighlightNodes(layout);
  if (highlightGroup.children.length > 0) {
    group.add(highlightGroup);
  }

  // 3. Render list markers
  const listMarkerGroup = createListMarkerNodes(layout, doc);
  if (listMarkerGroup.children.length > 0) {
    group.add(listMarkerGroup);
  }

  // 4. Render text characters (grouped by style for performance)
  const textGroup = createTextNodes(layout);
  group.add(textGroup);

  // 5. Render text decorations (underline, strikethrough)
  const decorationGroup = createDecorationNodes(layout);
  if (decorationGroup.children.length > 0) {
    group.add(decorationGroup);
  }

  // 6. Render caret
  if (caretInfo && caretVisible) {
    const caretNode = createCaretNode(caretInfo);
    group.add(caretNode);
  }

  return group;
}

/**
 * Create selection highlight rectangles
 */
function createSelectionNodes(layout: LayoutResult, selection: Selection): Konva.Group {
  const group = new Konva.Group();
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);

  // Group characters by line for efficient rectangle drawing
  const lineSelections = new Map<number, { x: number; width: number; y: number; height: number }>();

  for (const char of layout.chars) {
    if (char.char.absoluteIndex >= start && char.char.absoluteIndex < end) {
      const lineKey = char.lineIndex;

      if (!lineSelections.has(lineKey)) {
        lineSelections.set(lineKey, {
          x: char.x,
          width: char.width,
          y: char.y,
          height: char.height,
        });
      } else {
        const existing = lineSelections.get(lineKey)!;
        const newEndX = char.x + char.width;
        existing.width = newEndX - existing.x;
      }
    }
  }

  // Create rectangles for each line's selection
  for (const [, rect] of lineSelections) {
    const selectionRect = new Konva.Rect({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fill: 'rgba(0, 120, 255, 0.3)',
      listening: false,
    });
    group.add(selectionRect);
  }

  return group;
}

/**
 * Create text background highlight rectangles
 */
function createHighlightNodes(layout: LayoutResult): Konva.Group {
  const group = new Konva.Group();

  // Group consecutive chars with same background color
  let currentHighlight: {
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;

  for (const char of layout.chars) {
    const bgColor = char.char.style.backgroundColor;

    if (bgColor) {
      if (currentHighlight && currentHighlight.color === bgColor && currentHighlight.y === char.y) {
        // Extend current highlight
        currentHighlight.width = char.x + char.width - currentHighlight.x;
      } else {
        // Save previous highlight
        if (currentHighlight) {
          const rect = new Konva.Rect({
            x: currentHighlight.x,
            y: currentHighlight.y,
            width: currentHighlight.width,
            height: currentHighlight.height,
            fill: currentHighlight.color,
            listening: false,
          });
          group.add(rect);
        }
        // Start new highlight
        currentHighlight = {
          color: bgColor,
          x: char.x,
          y: char.y,
          width: char.width,
          height: char.height,
        };
      }
    } else if (currentHighlight) {
      // End current highlight
      const rect = new Konva.Rect({
        x: currentHighlight.x,
        y: currentHighlight.y,
        width: currentHighlight.width,
        height: currentHighlight.height,
        fill: currentHighlight.color,
        listening: false,
      });
      group.add(rect);
      currentHighlight = null;
    }
  }

  // Don't forget last highlight
  if (currentHighlight) {
    const rect = new Konva.Rect({
      x: currentHighlight.x,
      y: currentHighlight.y,
      width: currentHighlight.width,
      height: currentHighlight.height,
      fill: currentHighlight.color,
      listening: false,
    });
    group.add(rect);
  }

  return group;
}

/**
 * Create text nodes grouped by style for performance
 */
function createTextNodes(layout: LayoutResult): Konva.Group {
  const group = new Konva.Group();

  // Group consecutive characters with same style on same line
  const textRuns: {
    text: string;
    x: number;
    y: number;
    style: PositionedChar['char']['style'];
    baseline: number;
  }[] = [];

  let currentRun: (typeof textRuns)[0] | null = null;

  for (const char of layout.chars) {
    // Skip newlines - they're just for document structure
    if (char.char.char === '\n') {
      if (currentRun) {
        textRuns.push(currentRun);
        currentRun = null;
      }
      continue;
    }

    const canMerge =
      currentRun &&
      stylesMatch(currentRun.style, char.char.style) &&
      Math.abs(currentRun.y - char.y) < 1 && // Same line
      char.char.style.letterSpacing === 0; // No letter spacing (otherwise positions diverge)

    if (canMerge) {
      currentRun!.text += char.char.char;
    } else {
      if (currentRun) {
        textRuns.push(currentRun);
      }
      currentRun = {
        text: char.char.char,
        x: char.x,
        y: char.y,
        style: char.char.style,
        baseline: char.baseline,
      };
    }
  }

  if (currentRun) {
    textRuns.push(currentRun);
  }

  // Create Konva.Text nodes for each run
  for (const run of textRuns) {
    const textNode = new Konva.Text({
      x: run.x,
      y: run.y,
      text: run.text,
      fontSize: run.style.fontSize,
      fontFamily: run.style.fontFamily,
      fontStyle: buildFontStyle(run.style),
      fill: run.style.color,
      letterSpacing: run.style.letterSpacing,
      listening: false,
    });

    // Apply stroke if defined
    if (run.style.stroke) {
      textNode.stroke(run.style.stroke.color);
      textNode.strokeWidth(run.style.stroke.width);
    }

    // Apply shadow if defined
    if (run.style.shadow) {
      textNode.shadowColor(run.style.shadow.color);
      textNode.shadowBlur(run.style.shadow.blur);
      textNode.shadowOffsetX(run.style.shadow.offsetX);
      textNode.shadowOffsetY(run.style.shadow.offsetY);
    }

    group.add(textNode);
  }

  return group;
}

/**
 * Create decoration nodes (underline, strikethrough)
 */
function createDecorationNodes(layout: LayoutResult): Konva.Group {
  const group = new Konva.Group();

  // Process each line
  for (const line of layout.lines) {
    // Find underline runs
    const underlineRuns = findDecorationRuns(line.chars, 'underline');
    for (const run of underlineRuns) {
      const underlineY = line.y + line.baseline + 2;
      const underline = new Konva.Line({
        points: [run.startX, underlineY, run.endX, underlineY],
        stroke: run.color,
        strokeWidth: 1,
        listening: false,
      });
      group.add(underline);
    }

    // Find strikethrough runs
    const strikeRuns = findDecorationRuns(line.chars, 'strikethrough');
    for (const run of strikeRuns) {
      const strikeY = line.y + line.baseline - line.height * 0.3;
      const strike = new Konva.Line({
        points: [run.startX, strikeY, run.endX, strikeY],
        stroke: run.color,
        strokeWidth: 1,
        listening: false,
      });
      group.add(strike);
    }
  }

  return group;
}

/**
 * Find continuous runs of a decoration type
 */
function findDecorationRuns(
  chars: PositionedChar[],
  decorationType: 'underline' | 'strikethrough'
): { startX: number; endX: number; color: string }[] {
  const runs: { startX: number; endX: number; color: string }[] = [];
  let currentRun: { startX: number; endX: number; color: string } | null = null;

  for (const char of chars) {
    const hasDecoration = char.char.style[decorationType];

    if (hasDecoration) {
      if (currentRun) {
        currentRun.endX = char.x + char.width;
      } else {
        currentRun = {
          startX: char.x,
          endX: char.x + char.width,
          color: char.char.style.color,
        };
      }
    } else if (currentRun) {
      runs.push(currentRun);
      currentRun = null;
    }
  }

  if (currentRun) {
    runs.push(currentRun);
  }

  return runs;
}

/**
 * Create list marker nodes (bullets, numbers)
 */
function createListMarkerNodes(layout: LayoutResult, doc: RichTextDocument): Konva.Group {
  const group = new Konva.Group();

  for (const line of layout.lines) {
    if (line.listItem) {
      const markerNode = createSingleListMarker(line, doc.padding);
      group.add(markerNode);
    }
  }

  return group;
}

/**
 * Create a single list marker (bullet or number)
 */
function createSingleListMarker(line: LayoutLine, padding: number): Konva.Group | Konva.Shape {
  const listItem = line.listItem!;
  const markerX = padding + listItem.level * 20 + 10;
  const markerY = line.y + line.baseline;

  if (listItem.type === 'bullet') {
    const level = listItem.level % 3;

    if (level === 0) {
      // Filled circle
      return new Konva.Circle({
        x: markerX,
        y: markerY - 4,
        radius: 3,
        fill: '#000000',
        listening: false,
      });
    } else if (level === 1) {
      // Empty circle
      return new Konva.Circle({
        x: markerX,
        y: markerY - 4,
        radius: 3,
        stroke: '#000000',
        strokeWidth: 1,
        listening: false,
      });
    } else {
      // Filled square
      return new Konva.Rect({
        x: markerX - 3,
        y: markerY - 7,
        width: 6,
        height: 6,
        fill: '#000000',
        listening: false,
      });
    }
  } else {
    // Numbered list
    const level = listItem.level % 3;
    let numberText: string;

    if (level === 0) {
      numberText = `${listItem.index}.`;
    } else if (level === 1) {
      numberText = `${String.fromCharCode(96 + listItem.index)}.`;
    } else {
      numberText = `${toRomanNumeral(listItem.index)}.`;
    }

    return new Konva.Text({
      x: padding + listItem.level * 20,
      y: line.y,
      text: numberText,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#000000',
      listening: false,
    });
  }
}

/**
 * Convert number to roman numeral
 */
function toRomanNumeral(num: number): string {
  const romanNumerals: [number, string][] = [
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];

  let result = '';
  let remaining = num;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

/**
 * Create caret node
 */
function createCaretNode(caretInfo: CaretInfo): Konva.Rect {
  return new Konva.Rect({
    x: caretInfo.x,
    y: caretInfo.y,
    width: 2,
    height: caretInfo.height,
    fill: '#000000',
    listening: false,
  });
}

/**
 * Build Konva font style string
 */
function buildFontStyle(style: PositionedChar['char']['style']): string {
  const parts: string[] = [];

  if (style.fontStyle === 'italic') {
    parts.push('italic');
  }

  if (style.fontWeight === 'bold' || (typeof style.fontWeight === 'number' && style.fontWeight >= 700)) {
    parts.push('bold');
  }

  return parts.join(' ') || 'normal';
}

/**
 * Check if two styles match (for grouping text)
 */
function stylesMatch(
  a: PositionedChar['char']['style'],
  b: PositionedChar['char']['style']
): boolean {
  // Compare basic styles
  if (
    a.fontFamily !== b.fontFamily ||
    a.fontSize !== b.fontSize ||
    a.fontWeight !== b.fontWeight ||
    a.fontStyle !== b.fontStyle ||
    a.color !== b.color ||
    a.letterSpacing !== b.letterSpacing
  ) {
    return false;
  }

  // Compare stroke
  const bothHaveStroke = a.stroke && b.stroke;
  const neitherHasStroke = !a.stroke && !b.stroke;
  if (!neitherHasStroke) {
    if (!bothHaveStroke) return false;
    if (
      a.stroke!.color !== b.stroke!.color ||
      a.stroke!.width !== b.stroke!.width
    ) {
      return false;
    }
  }

  // Compare shadow
  const bothHaveShadow = a.shadow && b.shadow;
  const neitherHasShadow = !a.shadow && !b.shadow;
  if (!neitherHasShadow) {
    if (!bothHaveShadow) return false;
    if (
      a.shadow!.color !== b.shadow!.color ||
      a.shadow!.blur !== b.shadow!.blur ||
      a.shadow!.offsetX !== b.shadow!.offsetX ||
      a.shadow!.offsetY !== b.shadow!.offsetY
    ) {
      return false;
    }
  }

  return true;
}
