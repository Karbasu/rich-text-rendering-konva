// ============================================================================
// Offscreen Canvas Renderer
// ============================================================================

import {
  RichTextDocument,
  LayoutResult,
  PositionedChar,
  Selection,
} from './types';
import { buildFontString, getFontMetrics, getSelectionBoxes } from './layout-engine';

/**
 * Render text to an offscreen canvas
 */
export function renderTextToCanvas(
  layout: LayoutResult,
  _doc: RichTextDocument,
  selection: Selection | null,
  caretPosition: { x: number; y: number; height: number } | null,
  caretVisible: boolean,
  devicePixelRatio: number = window.devicePixelRatio || 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Set canvas size with device pixel ratio for sharp rendering
  const width = layout.width;
  const height = layout.height;

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Render selection background
  if (selection && selection.anchor !== selection.focus) {
    const start = Math.min(selection.anchor, selection.focus);
    const end = Math.max(selection.anchor, selection.focus);
    const selectionBoxes = getSelectionBoxes(layout, start, end);

    ctx.fillStyle = 'rgba(66, 133, 244, 0.3)'; // Google-like selection blue
    for (const box of selectionBoxes) {
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }
  }

  // Render list markers
  renderListMarkers(ctx, layout);

  // Render text
  renderChars(ctx, layout.chars);

  // Render caret
  if (caretVisible && caretPosition && selection?.anchor === selection?.focus) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(caretPosition.x, caretPosition.y, 2, caretPosition.height);
  }

  return canvas;
}

/**
 * Render list bullets and numbers
 */
function renderListMarkers(ctx: CanvasRenderingContext2D, layout: LayoutResult): void {
  // Track which source lines we've already rendered markers for
  const renderedSourceLines = new Set<number>();

  for (const line of layout.lines) {
    if (!line.listItem) continue;

    // Only render marker for the first visual line of each source line
    if (renderedSourceLines.has(line.lineIndex)) continue;

    // Check if this is the first line for this list item (has the indent)
    if (line.listIndent === 0) continue;

    // Get representative style from line (use first char's style or default)
    const style = line.chars[0]?.char.style || {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal' as const,
      fontStyle: 'normal' as const,
      color: '#000000',
      underline: false,
      strikethrough: false,
      letterSpacing: 0,
      lineHeight: 1.4,
    };

    ctx.font = buildFontString(style);
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'alphabetic';

    const markerX = line.listIndent - 16 + 8; // Position marker before text
    const textY = line.y + line.baseline;

    if (line.listItem.type === 'bullet') {
      // Draw different bullet styles based on nesting level
      const bulletSize = style.fontSize * 0.25;
      const bulletY = textY - style.fontSize * 0.35;
      const level = line.listItem.level % 3; // Cycle through 3 styles

      ctx.beginPath();

      if (level === 0) {
        // Filled circle (●)
        ctx.arc(markerX, bulletY, bulletSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (level === 1) {
        // Empty circle (○)
        ctx.arc(markerX, bulletY, bulletSize, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Filled square (■)
        const squareSize = bulletSize * 1.6;
        ctx.fillRect(
          markerX - squareSize / 2,
          bulletY - squareSize / 2,
          squareSize,
          squareSize
        );
      }
    } else if (line.listItem.type === 'number') {
      // Draw different number styles based on nesting level
      const level = line.listItem.level % 3;
      let numberText: string;

      if (level === 0) {
        // Arabic numerals (1. 2. 3.)
        numberText = `${line.listItem.index}.`;
      } else if (level === 1) {
        // Lowercase letters (a. b. c.)
        numberText = `${String.fromCharCode(96 + ((line.listItem.index - 1) % 26) + 1)}.`;
      } else {
        // Roman numerals (i. ii. iii.)
        numberText = `${toRomanNumeral(line.listItem.index)}.`;
      }

      const numberWidth = ctx.measureText(numberText).width;
      ctx.fillText(numberText, markerX - numberWidth / 2, textY);
    }

    renderedSourceLines.add(line.lineIndex);
  }
}

/**
 * Convert number to lowercase Roman numeral
 */
function toRomanNumeral(num: number): string {
  const romanNumerals = [
    ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'],
    ['', 'x', 'xx', 'xxx', 'xl', 'l', 'lx', 'lxx', 'lxxx', 'xc'],
    ['', 'c', 'cc', 'ccc', 'cd', 'd', 'dc', 'dcc', 'dccc', 'cm'],
  ];

  if (num <= 0 || num > 399) return num.toString();

  const hundreds = Math.floor(num / 100);
  const tens = Math.floor((num % 100) / 10);
  const ones = num % 10;

  return romanNumerals[2][hundreds] + romanNumerals[1][tens] + romanNumerals[0][ones];
}

/**
 * Render characters to canvas context
 */
function renderChars(ctx: CanvasRenderingContext2D, chars: PositionedChar[]): void {
  for (const posChar of chars) {
    const { char, style } = posChar.char;
    const metrics = getFontMetrics(style);

    // Set font
    ctx.font = buildFontString(style);
    ctx.textBaseline = 'alphabetic';

    const textY = posChar.y + posChar.baseline;

    // Render background if specified
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(posChar.x, posChar.y, posChar.width, posChar.height);
    }

    // Render shadow if specified
    if (style.shadow) {
      ctx.shadowColor = style.shadow.color;
      ctx.shadowBlur = style.shadow.blur;
      ctx.shadowOffsetX = style.shadow.offsetX;
      ctx.shadowOffsetY = style.shadow.offsetY;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Render stroke if specified (render before fill for proper layering)
    if (style.stroke && style.stroke.width > 0) {
      ctx.strokeStyle = style.stroke.color;
      ctx.lineWidth = style.stroke.width;
      ctx.lineJoin = 'round';
      ctx.strokeText(char, posChar.x, textY);
    }

    // Render text fill
    ctx.fillStyle = style.color;
    ctx.fillText(char, posChar.x, textY);

    // Clear shadow for decorations
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Render underline
    if (style.underline) {
      const underlineY = textY + metrics.descent * 0.3;
      const underlineThickness = Math.max(1, style.fontSize / 16);

      ctx.strokeStyle = style.color;
      ctx.lineWidth = underlineThickness;
      ctx.beginPath();
      ctx.moveTo(posChar.x, underlineY);
      ctx.lineTo(posChar.x + posChar.width, underlineY);
      ctx.stroke();
    }

    // Render strikethrough
    if (style.strikethrough) {
      const strikeY = textY - metrics.ascent * 0.35;
      const strikeThickness = Math.max(1, style.fontSize / 16);

      ctx.strokeStyle = style.color;
      ctx.lineWidth = strikeThickness;
      ctx.beginPath();
      ctx.moveTo(posChar.x, strikeY);
      ctx.lineTo(posChar.x + posChar.width, strikeY);
      ctx.stroke();
    }
  }
}

/**
 * Render only the caret (for blinking animation)
 */
export function renderCaret(
  caretPosition: { x: number; y: number; height: number },
  color: string = '#000000',
  width: number = 2
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = caretPosition.height * dpr;

  ctx.scale(dpr, dpr);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, caretPosition.height);

  return canvas;
}

/**
 * Create a placeholder/empty text box rendering
 */
export function renderPlaceholder(
  width: number,
  height: number,
  placeholder: string,
  style: { fontFamily: string; fontSize: number; color: string }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.scale(dpr, dpr);

  ctx.font = `${style.fontSize}px ${style.fontFamily}`;
  ctx.fillStyle = style.color;
  ctx.globalAlpha = 0.5;
  ctx.textBaseline = 'top';

  const padding = 8;
  ctx.fillText(placeholder, padding, padding);

  return canvas;
}

/**
 * Render text box border/outline
 */
export function renderTextBoxBorder(
  width: number,
  height: number,
  isEditing: boolean,
  isSelected: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.scale(dpr, dpr);

  if (isEditing) {
    // Editing border - solid blue
    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  } else if (isSelected) {
    // Selected but not editing - dashed
    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }

  return canvas;
}

/**
 * Optimize rendering by only updating changed areas
 * Returns true if content changed significantly
 */
export function shouldRerender(
  prevLayout: LayoutResult | null,
  newLayout: LayoutResult,
  prevSelection: Selection | null,
  newSelection: Selection | null
): boolean {
  // Always rerender if no previous layout
  if (!prevLayout) return true;

  // Check if layout dimensions changed
  if (prevLayout.width !== newLayout.width || prevLayout.height !== newLayout.height) {
    return true;
  }

  // Check if character count changed
  if (prevLayout.chars.length !== newLayout.chars.length) {
    return true;
  }

  // Check if selection changed
  const prevStart = prevSelection ? Math.min(prevSelection.anchor, prevSelection.focus) : -1;
  const prevEnd = prevSelection ? Math.max(prevSelection.anchor, prevSelection.focus) : -1;
  const newStart = newSelection ? Math.min(newSelection.anchor, newSelection.focus) : -1;
  const newEnd = newSelection ? Math.max(newSelection.anchor, newSelection.focus) : -1;

  if (prevStart !== newStart || prevEnd !== newEnd) {
    return true;
  }

  // Deep check characters (expensive, do sparingly)
  for (let i = 0; i < newLayout.chars.length; i++) {
    const prev = prevLayout.chars[i];
    const next = newLayout.chars[i];

    if (
      prev.char.char !== next.char.char ||
      prev.x !== next.x ||
      prev.y !== next.y ||
      prev.char.style.color !== next.char.style.color
    ) {
      return true;
    }
  }

  return false;
}
