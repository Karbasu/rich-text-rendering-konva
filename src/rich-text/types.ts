// ============================================================================
// Rich Text Editor Core Types
// ============================================================================

/**
 * Text style properties for a span of text
 */
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | number;
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  underline: boolean;
  strikethrough: boolean;
  letterSpacing: number; // in pixels
  lineHeight: number; // multiplier (e.g., 1.2)
  // Advanced styles
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

/**
 * Default text style
 */
export const DEFAULT_STYLE: TextStyle = {
  fontFamily: 'Arial',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  underline: false,
  strikethrough: false,
  letterSpacing: 0,
  lineHeight: 1.4,
};

/**
 * A span represents a contiguous run of text with the same style
 */
export interface TextSpan {
  id: string;
  text: string;
  style: TextStyle;
}

/**
 * Text alignment options
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * Vertical alignment options
 */
export type VerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * The document model - represents the entire text content
 */
export interface RichTextDocument {
  spans: TextSpan[];
  align: TextAlign;
  verticalAlign: VerticalAlign;
  padding: number;
}

/**
 * Position in the document (character index)
 */
export interface DocumentPosition {
  spanIndex: number;
  charOffset: number;
}

/**
 * Absolute position in document (flattened character index)
 */
export type AbsolutePosition = number;

/**
 * Selection range in the document
 */
export interface Selection {
  anchor: AbsolutePosition; // Where selection started
  focus: AbsolutePosition; // Where selection ended (cursor position)
}

/**
 * A single character with its style and position
 */
export interface StyledChar {
  char: string;
  style: TextStyle;
  spanId: string;
  absoluteIndex: number;
}

/**
 * A token for layout - can be a word, whitespace, or newline
 */
export interface LayoutToken {
  chars: StyledChar[];
  width: number;
  type: 'word' | 'whitespace' | 'newline';
}

/**
 * A positioned character after layout
 */
export interface PositionedChar {
  char: StyledChar;
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  lineIndex: number;
}

/**
 * A line of text after layout
 */
export interface LayoutLine {
  chars: PositionedChar[];
  y: number;
  height: number;
  baseline: number;
  width: number;
  lineIndex: number;
}

/**
 * Complete layout result
 */
export interface LayoutResult {
  lines: LayoutLine[];
  width: number;
  height: number;
  chars: PositionedChar[];
}

/**
 * Caret visual representation
 */
export interface CaretInfo {
  x: number;
  y: number;
  height: number;
  visible: boolean;
}

/**
 * Selection box for visual rendering
 */
export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  document: RichTextDocument;
  selection: Selection;
  timestamp: number;
}

/**
 * Text box configuration
 */
export interface TextBoxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  autoHeight?: boolean;
}

/**
 * Editor state
 */
export interface EditorState {
  document: RichTextDocument;
  selection: Selection;
  isEditing: boolean;
  caretVisible: boolean;
  currentStyle: Partial<TextStyle>;
}

/**
 * Generate unique ID for spans
 */
export function generateSpanId(): string {
  return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an empty document
 */
export function createEmptyDocument(): RichTextDocument {
  return {
    spans: [
      {
        id: generateSpanId(),
        text: '',
        style: { ...DEFAULT_STYLE },
      },
    ],
    align: 'left',
    verticalAlign: 'top',
    padding: 8,
  };
}

/**
 * Create a document with initial text
 */
export function createDocument(text: string, style?: Partial<TextStyle>): RichTextDocument {
  return {
    spans: [
      {
        id: generateSpanId(),
        text,
        style: { ...DEFAULT_STYLE, ...style },
      },
    ],
    align: 'left',
    verticalAlign: 'top',
    padding: 8,
  };
}
