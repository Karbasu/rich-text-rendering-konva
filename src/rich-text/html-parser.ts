// ============================================================================
// HTML to Rich Text Parser
// Converts HTML from external sources (Google Docs, Word, Canva) to TextSpan[]
// ============================================================================

import { TextSpan, TextStyle, DEFAULT_STYLE, generateSpanId } from './types';

/**
 * Parse HTML string and convert to array of styled spans
 * Handles common HTML tags and inline styles
 */
export function parseHTMLToSpans(html: string): TextSpan[] {
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  if (!body) {
    return [];
  }

  const spans: TextSpan[] = [];
  const styleStack: Partial<TextStyle>[] = [{}];

  // Recursively process nodes
  processNode(body, styleStack, spans);

  // Normalize: merge adjacent spans with same style, remove empty spans
  return normalizeSpans(spans);
}

/**
 * Process a DOM node and its children
 */
function processNode(
  node: Node,
  styleStack: Partial<TextStyle>[],
  spans: TextSpan[]
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    // Text node - create span with current style
    const text = node.textContent || '';
    if (text) {
      const currentStyle = mergeStyleStack(styleStack);
      spans.push({
        id: generateSpanId(),
        text: text,
        style: { ...DEFAULT_STYLE, ...currentStyle },
      });
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    // Extract styles from this element
    const elementStyle = extractStyleFromElement(element);

    // Handle special tags
    const tagStyle = getStyleFromTag(tagName);

    // Combine tag style with inline style
    const combinedStyle = { ...tagStyle, ...elementStyle };

    // Push style to stack
    styleStack.push(combinedStyle);

    // Handle line breaks
    if (tagName === 'br') {
      const currentStyle = mergeStyleStack(styleStack);
      spans.push({
        id: generateSpanId(),
        text: '\n',
        style: { ...DEFAULT_STYLE, ...currentStyle },
      });
    } else if (isBlockElement(tagName)) {
      // Add newline before block elements (except first)
      if (spans.length > 0 && !spans[spans.length - 1].text.endsWith('\n')) {
        const currentStyle = mergeStyleStack(styleStack);
        spans.push({
          id: generateSpanId(),
          text: '\n',
          style: { ...DEFAULT_STYLE, ...currentStyle },
        });
      }
    }

    // Process children
    for (const child of Array.from(node.childNodes)) {
      processNode(child, styleStack, spans);
    }

    // Add newline after block elements
    if (isBlockElement(tagName) && spans.length > 0) {
      if (!spans[spans.length - 1].text.endsWith('\n')) {
        const currentStyle = mergeStyleStack(styleStack);
        spans.push({
          id: generateSpanId(),
          text: '\n',
          style: { ...DEFAULT_STYLE, ...currentStyle },
        });
      }
    }

    // Pop style from stack
    styleStack.pop();
  }
}

/**
 * Get style properties from HTML tag name
 */
function getStyleFromTag(tagName: string): Partial<TextStyle> {
  switch (tagName) {
    case 'b':
    case 'strong':
      return { fontWeight: 'bold' };

    case 'i':
    case 'em':
      return { fontStyle: 'italic' };

    case 'u':
      return { underline: true };

    case 's':
    case 'strike':
    case 'del':
      return { strikethrough: true };

    case 'mark':
      return { backgroundColor: '#FFFF00' };

    default:
      return {};
  }
}

/**
 * Extract style properties from element's inline style and attributes
 */
function extractStyleFromElement(element: HTMLElement): Partial<TextStyle> {
  const style: Partial<TextStyle> = {};
  const computedStyle = element.style;

  // Font weight
  if (computedStyle.fontWeight) {
    const weight = computedStyle.fontWeight;
    if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
      style.fontWeight = 'bold';
    } else if (weight === 'normal' || weight === '400') {
      style.fontWeight = 'normal';
    } else if (!isNaN(parseInt(weight))) {
      style.fontWeight = parseInt(weight);
    }
  }

  // Font style
  if (computedStyle.fontStyle) {
    if (computedStyle.fontStyle === 'italic' || computedStyle.fontStyle === 'oblique') {
      style.fontStyle = 'italic';
    } else if (computedStyle.fontStyle === 'normal') {
      style.fontStyle = 'normal';
    }
  }

  // Font size
  if (computedStyle.fontSize) {
    const size = parseFloat(computedStyle.fontSize);
    if (!isNaN(size)) {
      // Convert pt to px if needed (rough conversion: 1pt ≈ 1.333px)
      if (computedStyle.fontSize.includes('pt')) {
        style.fontSize = Math.round(size * 1.333);
      } else {
        style.fontSize = Math.round(size);
      }
    }
  }

  // Font family
  if (computedStyle.fontFamily) {
    // Clean up font family string
    let family = computedStyle.fontFamily;
    // Remove quotes and get first font
    family = family.replace(/["']/g, '').split(',')[0].trim();
    if (family) {
      style.fontFamily = family;
    }
  }

  // Text color
  if (computedStyle.color) {
    const color = parseColor(computedStyle.color);
    if (color) {
      style.color = color;
    }
  }

  // Background color
  if (computedStyle.backgroundColor) {
    const bgColor = parseColor(computedStyle.backgroundColor);
    if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      style.backgroundColor = bgColor;
    }
  }

  // Text decoration
  if (computedStyle.textDecoration || computedStyle.textDecorationLine) {
    const decoration = computedStyle.textDecoration || computedStyle.textDecorationLine;
    if (decoration.includes('underline')) {
      style.underline = true;
    }
    if (decoration.includes('line-through')) {
      style.strikethrough = true;
    }
  }

  // Letter spacing
  if (computedStyle.letterSpacing) {
    const spacing = parseFloat(computedStyle.letterSpacing);
    if (!isNaN(spacing)) {
      style.letterSpacing = spacing;
    }
  }

  // Line height
  if (computedStyle.lineHeight) {
    const lineHeight = computedStyle.lineHeight;
    if (lineHeight !== 'normal') {
      const value = parseFloat(lineHeight);
      if (!isNaN(value)) {
        // If it's a pixel value, convert to multiplier (assume 16px base)
        if (lineHeight.includes('px')) {
          style.lineHeight = value / 16;
        } else {
          style.lineHeight = value;
        }
      }
    }
  }

  return style;
}

/**
 * Parse color string to hex or rgba format
 */
function parseColor(colorStr: string): string | null {
  if (!colorStr || colorStr === 'transparent') {
    return null;
  }

  // Already hex
  if (colorStr.startsWith('#')) {
    return colorStr;
  }

  // RGB/RGBA format
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    // Convert to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Named colors - return as-is, canvas will understand
  return colorStr;
}

/**
 * Check if tag is a block-level element
 */
function isBlockElement(tagName: string): boolean {
  const blockElements = [
    'p',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
    'li',
    'tr',
  ];
  return blockElements.includes(tagName);
}

/**
 * Merge all styles in the stack (later styles override earlier ones)
 */
function mergeStyleStack(styleStack: Partial<TextStyle>[]): Partial<TextStyle> {
  const merged: Partial<TextStyle> = {};

  for (const style of styleStack) {
    Object.assign(merged, style);
  }

  return merged;
}

/**
 * Normalize spans: merge adjacent spans with same style, remove empty
 */
function normalizeSpans(spans: TextSpan[]): TextSpan[] {
  if (spans.length === 0) return [];

  const result: TextSpan[] = [];

  for (const span of spans) {
    if (!span.text) continue; // Skip empty spans

    if (result.length === 0) {
      result.push(span);
    } else {
      const lastSpan = result[result.length - 1];

      // Check if styles are equal
      if (stylesEqual(lastSpan.style, span.style)) {
        // Merge spans
        lastSpan.text += span.text;
      } else {
        result.push(span);
      }
    }
  }

  // Clean up: remove trailing newlines if multiple
  if (result.length > 0) {
    const lastSpan = result[result.length - 1];
    while (lastSpan.text.endsWith('\n\n')) {
      lastSpan.text = lastSpan.text.slice(0, -1);
    }
  }

  return result;
}

/**
 * Compare two TextStyle objects for equality
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
    a.lineHeight === b.lineHeight
  );
}

/**
 * Convenience function to check if HTML contains styled content
 */
export function hasStyledContent(html: string): boolean {
  // Quick check for common styling indicators
  return (
    html.includes('<b>') ||
    html.includes('<strong>') ||
    html.includes('<i>') ||
    html.includes('<em>') ||
    html.includes('<u>') ||
    html.includes('style=') ||
    html.includes('<span') ||
    html.includes('font-weight') ||
    html.includes('color:') ||
    html.includes('font-size')
  );
}
