// ============================================================================
// RichTextNode - Custom Konva Component for Rich Text Editing
// ============================================================================

import Konva from 'konva';
import {
  RichTextDocument,
  Selection,
  TextStyle,
  LayoutResult,
  HistoryEntry,
  createEmptyDocument,
  DEFAULT_STYLE,
  AbsolutePosition,
} from './types';
import {
  getDocumentLength,
  deleteRange,
  replaceSelection,
  getSelectedText,
  applyStyleToRange,
  toggleBoldInRange,
  toggleItalicInRange,
  toggleStyleInRange,
  getStyleAtPosition,
  cloneDocument,
  getLineIndexForPosition,
  toggleListForLines,
  indentListItem,
  outdentListItem,
  removeListItemAtLine,
  renumberLists,
  isLineEmpty,
  getLineStartPosition,
} from './document-model';
import { layoutText, getCaretPosition, hitTest, hitTestBulletZone } from './layout-engine';
import { renderTextToCanvas } from './renderer';

interface RichTextNodeConfig extends Konva.GroupConfig {
  width: number;
  height: number;
  document?: RichTextDocument;
  placeholder?: string;
  editable?: boolean;
}

/**
 * Custom Konva Group that renders rich text with full editing capabilities
 */
export class RichTextNode extends Konva.Group {
  private _document: RichTextDocument;
  private _selection: Selection;
  private _isEditing: boolean = false;
  private _caretVisible: boolean = true;
  private _caretBlinkInterval: number | null = null;
  private _layout: LayoutResult | null = null;
  private _textImage: Konva.Image | null = null;
  private _borderRect: Konva.Rect | null = null;
  private _hitArea: Konva.Rect | null = null;
  private _placeholder: string;
  private _editable: boolean;
  private _history: HistoryEntry[] = [];
  private _historyIndex: number = -1;
  private _maxHistory: number = 100;
  private _isDraggingSelection: boolean = false;
  private _currentStyle: Partial<TextStyle> = {};
  private _boxWidth: number;
  private _boxHeight: number;
  private _minWidth: number = 50;
  private _minHeight: number = 30;

  // Event handlers bound to this instance
  private _boundKeyDownHandler: (e: KeyboardEvent) => void;
  private _boundKeyPressHandler: (e: KeyboardEvent) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _boundMouseMoveHandler: (e: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _boundMouseUpHandler: (e: any) => void;

  constructor(config: RichTextNodeConfig) {
    super(config);

    this._boxWidth = config.width;
    this._boxHeight = config.height;
    this._document = config.document || createEmptyDocument();
    this._selection = { anchor: 0, focus: 0 };
    this._placeholder = config.placeholder || 'Click to edit...';
    this._editable = config.editable !== false;

    // Bind event handlers
    this._boundKeyDownHandler = this._handleKeyDown.bind(this);
    this._boundKeyPressHandler = this._handleKeyPress.bind(this);
    this._boundMouseMoveHandler = this._handleMouseMove.bind(this);
    this._boundMouseUpHandler = this._handleMouseUp.bind(this);

    // Initialize visual components
    this._initializeVisuals();

    // Setup event handlers
    this._setupEvents();

    // Initial render
    this._updateLayout();
    this._render();

    // Save initial state to history
    this._pushHistory();
  }

  /**
   * Initialize visual Konva nodes
   */
  private _initializeVisuals(): void {
    // Hit area for receiving events (invisible but clickable)
    this._hitArea = new Konva.Rect({
      x: 0,
      y: 0,
      width: this._boxWidth,
      height: this._boxHeight,
      fill: 'transparent',
      listening: true,
    });
    this.add(this._hitArea);

    // Border/selection rectangle
    this._borderRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: this._boxWidth,
      height: this._boxHeight,
      stroke: 'transparent',
      strokeWidth: 0,
      listening: false,
    });
    this.add(this._borderRect);

    // Text image (rendered from offscreen canvas)
    this._textImage = new Konva.Image({
      x: 0,
      y: 0,
      width: this._boxWidth,
      height: this._boxHeight,
      listening: false,
      image: undefined,
    });
    this.add(this._textImage);
  }

  /**
   * Setup event handlers for interaction
   */
  private _setupEvents(): void {
    // Click to start editing or place caret
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.on('click', this._handleClick.bind(this) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.on('dblclick', this._handleDoubleClick.bind(this) as any);

    // Mouse down for selection start
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.on('mousedown', this._handleMouseDown.bind(this) as any);

    // Transform events for resizing
    this.on('transform', this._handleTransform.bind(this));
    this.on('transformend', this._handleTransformEnd.bind(this));
  }

  /**
   * Handle click event
   */
  private _handleClick(e: Konva.KonvaEventObject<MouseEvent>): void {
    if (!this._editable) return;

    e.cancelBubble = true;

    const pos = this._getRelativePointerPosition(e);
    if (!pos || !this._layout) return;

    if (!this._isEditing) {
      this.startEditing();
    }

    // Check if click is in bullet zone
    const bulletZoneResult = hitTestBulletZone(this._layout, pos.x, pos.y, this._document);

    let charIndex: number;
    if (bulletZoneResult.inBulletZone) {
      // Click in bullet zone - place caret at start of that line's text
      charIndex = getLineStartPosition(this._document, bulletZoneResult.lineIndex);
    } else {
      // Normal click - place caret at click position
      charIndex = hitTest(this._layout, pos.x, pos.y, this._document);
    }

    this._selection = { anchor: charIndex, focus: charIndex };
    this._updateCurrentStyle();
    this._render();
  }

  /**
   * Handle double click to select word
   */
  private _handleDoubleClick(e: Konva.KonvaEventObject<MouseEvent>): void {
    if (!this._editable || !this._layout) return;

    e.cancelBubble = true;

    const pos = this._getRelativePointerPosition(e);
    if (!pos) return;

    // Check if double-click is in bullet zone
    const bulletZoneResult = hitTestBulletZone(this._layout, pos.x, pos.y, this._document);

    if (bulletZoneResult.inBulletZone) {
      // Double-click in bullet zone - exit list for this line
      const lineIndex = bulletZoneResult.lineIndex;
      const listItem = this._document.listItems.get(lineIndex);

      if (listItem) {
        // Remove list formatting from this paragraph only
        const newListItems = new Map(this._document.listItems);
        newListItems.delete(lineIndex);
        this._document = { ...this._document, listItems: newListItems };

        // Renumber remaining list items
        this._document = renumberLists(this._document);

        // Place caret at start of text
        const caretPos = getLineStartPosition(this._document, lineIndex);
        this._selection = { anchor: caretPos, focus: caretPos };

        this._updateLayout();
        this._render();
        this._pushHistory();
      }
    } else {
      // Normal double-click - select word
      const charIndex = hitTest(this._layout, pos.x, pos.y, this._document);
      const { start, end } = this._getWordBoundaries(charIndex);

      this._selection = { anchor: start, focus: end };
      this._render();
    }
  }

  /**
   * Handle mouse down for selection drag
   */
  private _handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>): void {
    if (!this._editable || !this._isEditing) return;

    const pos = this._getRelativePointerPosition(e);
    if (!pos || !this._layout) return;

    const charIndex = hitTest(this._layout, pos.x, pos.y, this._document);

    if (e.evt.shiftKey) {
      // Extend selection
      this._selection = { ...this._selection, focus: charIndex };
    } else {
      // Start new selection
      this._selection = { anchor: charIndex, focus: charIndex };
    }

    this._isDraggingSelection = true;
    this._updateCurrentStyle();
    this._render();

    // Add temporary global listeners
    const stage = this.getStage();
    if (stage) {
      stage.on('mousemove', this._boundMouseMoveHandler);
      stage.on('mouseup', this._boundMouseUpHandler);
    }
  }

  /**
   * Handle mouse move for selection dragging
   */
  private _handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>): void {
    if (!this._isDraggingSelection || !this._layout) return;

    const pos = this._getRelativePointerPosition(e);
    if (!pos) return;

    const charIndex = hitTest(this._layout, pos.x, pos.y, this._document);
    this._selection = { ...this._selection, focus: charIndex };
    this._render();
  }

  /**
   * Handle mouse up to end selection
   */
  private _handleMouseUp(_e: Konva.KonvaEventObject<MouseEvent>): void {
    this._isDraggingSelection = false;

    // Remove temporary global listeners
    const stage = this.getStage();
    if (stage) {
      stage.off('mousemove', this._boundMouseMoveHandler);
      stage.off('mouseup', this._boundMouseUpHandler);
    }
  }

  /**
   * Handle transform (resize/rotate)
   */
  private _handleTransform(): void {
    // Get new dimensions from transform
    const scaleX = this.scaleX();
    const scaleY = this.scaleY();

    const newWidth = Math.max(this._minWidth, this._boxWidth * scaleX);
    const newHeight = Math.max(this._minHeight, this._boxHeight * scaleY);

    // Reset scale and update dimensions
    this.scaleX(1);
    this.scaleY(1);

    this._boxWidth = newWidth;
    this._boxHeight = newHeight;

    this._updateLayout();
    this._render();
  }

  /**
   * Handle transform end
   */
  private _handleTransformEnd(): void {
    this._handleTransform();
  }

  /**
   * Handle keyboard input
   */
  private _handleKeyDown(e: KeyboardEvent): void {
    if (!this._isEditing) return;

    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Prevent default for handled keys
    let handled = true;

    if (ctrl && key === 'z' && !shift) {
      this.undo();
    } else if (ctrl && (key === 'y' || (key === 'z' && shift))) {
      this.redo();
    } else if (ctrl && key === 'a') {
      this.selectAll();
    } else if (ctrl && key === 'b') {
      this.toggleBold();
    } else if (ctrl && key === 'i') {
      this.toggleItalic();
    } else if (ctrl && key === 'u') {
      this.toggleUnderline();
    } else if (ctrl && key === 'c') {
      this._copySelection();
      handled = false; // Let browser handle clipboard
    } else if (ctrl && key === 'x') {
      this._cutSelection();
      handled = false;
    } else if (ctrl && key === 'v') {
      handled = false; // Let browser handle paste
    } else if (key === 'Backspace') {
      this._handleBackspace();
    } else if (key === 'Delete') {
      this._handleDelete();
    } else if (key === 'Enter') {
      this._handleEnter();
    } else if (key === 'Tab') {
      this._handleTab(shift);
    } else if (key === 'ArrowLeft') {
      this._moveCaret('left', shift);
    } else if (key === 'ArrowRight') {
      this._moveCaret('right', shift);
    } else if (key === 'ArrowUp') {
      this._moveCaret('up', shift);
    } else if (key === 'ArrowDown') {
      this._moveCaret('down', shift);
    } else if (key === 'Home') {
      this._moveCaret('home', shift);
    } else if (key === 'End') {
      this._moveCaret('end', shift);
    } else if (key === 'Escape') {
      this.stopEditing();
    } else {
      handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Handle character input
   */
  private _handleKeyPress(e: KeyboardEvent): void {
    if (!this._isEditing) return;

    // Filter out control characters
    if (e.ctrlKey || e.metaKey || e.key.length !== 1) return;

    e.preventDefault();
    e.stopPropagation();

    this._insertText(e.key);
  }

  /**
   * Insert text at current position
   */
  private _insertText(text: string): void {
    const { doc, newPosition } = replaceSelection(
      this._document,
      this._selection,
      text,
      this._currentStyle
    );

    this._document = doc;
    this._selection = { anchor: newPosition, focus: newPosition };

    this._updateLayout();
    this._render();
    this._pushHistory();
    this._resetCaretBlink();
  }

  /**
   * Handle backspace key
   */
  private _handleBackspace(): void {
    const currentLineIndex = getLineIndexForPosition(this._document, this._selection.focus);
    const currentListItem = this._document.listItems.get(currentLineIndex);
    const lineStart = getLineStartPosition(this._document, currentLineIndex);

    if (this._selection.anchor !== this._selection.focus) {
      // Delete selection
      const { doc, newPosition } = replaceSelection(
        this._document,
        this._selection,
        ''
      );
      this._document = doc;
      this._selection = { anchor: newPosition, focus: newPosition };
      // Renumber lists after deletion
      this._document = renumberLists(this._document);
    } else if (currentListItem && this._selection.focus === lineStart) {
      // At start of a list item
      if (currentListItem.level > 0) {
        // Outdent first (decrease indentation level)
        this._document = outdentListItem(this._document, currentLineIndex);
        this._document = renumberLists(this._document);
      } else {
        // At level 0 - remove list formatting entirely
        const newListItems = new Map(this._document.listItems);
        newListItems.delete(currentLineIndex);
        this._document = { ...this._document, listItems: newListItems };
        this._document = renumberLists(this._document);
      }
    } else if (this._selection.focus > 0) {
      // Check if we're deleting a newline that would merge lines
      const chars = this._document.spans.map(s => s.text).join('');
      const charToDelete = chars[this._selection.focus - 1];

      if (charToDelete === '\n') {
        // Deleting a newline - need to adjust list items
        this._document = deleteRange(
          this._document,
          this._selection.focus - 1,
          this._selection.focus
        );
        // Remove list item for the line being merged and shift subsequent items
        this._document = removeListItemAtLine(this._document, currentLineIndex);
        this._document = renumberLists(this._document);
      } else {
        // Regular character deletion
        this._document = deleteRange(
          this._document,
          this._selection.focus - 1,
          this._selection.focus
        );
      }

      this._selection = {
        anchor: this._selection.focus - 1,
        focus: this._selection.focus - 1,
      };
    }

    this._updateLayout();
    this._render();
    this._pushHistory();
    this._resetCaretBlink();
  }

  /**
   * Handle delete key
   */
  private _handleDelete(): void {
    const docLength = getDocumentLength(this._document);

    if (this._selection.anchor !== this._selection.focus) {
      // Delete selection
      const { doc, newPosition } = replaceSelection(
        this._document,
        this._selection,
        ''
      );
      this._document = doc;
      this._selection = { anchor: newPosition, focus: newPosition };
      // Renumber lists after deletion
      this._document = renumberLists(this._document);
    } else if (this._selection.focus < docLength) {
      // Check if we're deleting a newline
      const chars = this._document.spans.map(s => s.text).join('');
      const charToDelete = chars[this._selection.focus];

      if (charToDelete === '\n') {
        // Deleting a newline - need to adjust list items
        const nextLineIndex = getLineIndexForPosition(this._document, this._selection.focus + 1);
        this._document = deleteRange(
          this._document,
          this._selection.focus,
          this._selection.focus + 1
        );
        // Remove list item for the next line being merged
        this._document = removeListItemAtLine(this._document, nextLineIndex);
        this._document = renumberLists(this._document);
      } else {
        // Regular character deletion
        this._document = deleteRange(
          this._document,
          this._selection.focus,
          this._selection.focus + 1
        );
      }
    }

    this._updateLayout();
    this._render();
    this._pushHistory();
    this._resetCaretBlink();
  }

  /**
   * Handle Enter key - create new line and continue list if applicable
   */
  private _handleEnter(): void {
    const currentLineIndex = getLineIndexForPosition(this._document, this._selection.focus);
    const currentListItem = this._document.listItems.get(currentLineIndex);

    // If current line is an empty list item, exit the list instead of creating new item
    if (currentListItem && isLineEmpty(this._document, currentLineIndex)) {
      // Remove the list formatting from current line
      const newListItems = new Map(this._document.listItems);
      newListItems.delete(currentLineIndex);
      this._document = { ...this._document, listItems: newListItems };
      this._updateLayout();
      this._render();
      this._pushHistory();
      this._resetCaretBlink();
      return;
    }

    // Check if caret is at the very start of a non-empty list item
    const lineStart = getLineStartPosition(this._document, currentLineIndex);
    const isAtLineStart = this._selection.focus === lineStart && this._selection.anchor === this._selection.focus;

    if (currentListItem && isAtLineStart && !isLineEmpty(this._document, currentLineIndex)) {
      // Special case: caret at start of non-empty list item
      // Create new empty list item ABOVE current, caret moves to new item
      const newListItems = new Map(this._document.listItems);

      // Shift all list items from current line onwards down by 1
      const entries = Array.from(this._document.listItems.entries()).sort((a, b) => b[0] - a[0]);
      for (const [lineIdx, item] of entries) {
        if (lineIdx >= currentLineIndex) {
          newListItems.delete(lineIdx);
          newListItems.set(lineIdx + 1, item);
        }
      }

      // Insert new empty list item at current line index
      newListItems.set(currentLineIndex, {
        type: currentListItem.type,
        level: currentListItem.level,
        index: currentListItem.type === 'number' ? currentListItem.index : 0,
      });

      // Insert newline before current text (at lineStart position)
      const { doc } = replaceSelection(
        this._document,
        { anchor: lineStart, focus: lineStart },
        '\n',
        this._currentStyle
      );

      this._document = { ...doc, listItems: newListItems };
      // Caret stays at original position (which is now start of the text that moved down)
      this._selection = { anchor: lineStart, focus: lineStart };

      // Renumber to ensure consistency
      this._document = renumberLists(this._document);

      this._updateLayout();
      this._render();
      this._pushHistory();
      this._resetCaretBlink();
      return;
    }

    // Insert newline first
    const { doc, newPosition } = replaceSelection(
      this._document,
      this._selection,
      '\n',
      this._currentStyle
    );

    this._document = doc;
    this._selection = { anchor: newPosition, focus: newPosition };

    // If current line is a list item, continue the list on the new line
    if (currentListItem) {
      const newLineIndex = currentLineIndex + 1;
      const newListItems = new Map(this._document.listItems);

      // Shift all existing list items after this point down by 1
      const entries = Array.from(this._document.listItems.entries()).sort((a, b) => b[0] - a[0]);
      for (const [lineIdx, item] of entries) {
        if (lineIdx > currentLineIndex) {
          newListItems.delete(lineIdx);
          newListItems.set(lineIdx + 1, item);
        }
      }

      // Add new list item with same type and level
      if (currentListItem.type === 'bullet') {
        newListItems.set(newLineIndex, {
          type: 'bullet',
          level: currentListItem.level,
          index: 0,
        });
      } else if (currentListItem.type === 'number') {
        // For numbered lists, increment the index
        newListItems.set(newLineIndex, {
          type: 'number',
          level: currentListItem.level,
          index: currentListItem.index + 1,
        });
      }

      this._document = { ...this._document, listItems: newListItems };
      // Renumber to ensure consistency
      this._document = renumberLists(this._document);
    }

    this._updateLayout();
    this._render();
    this._pushHistory();
    this._resetCaretBlink();
  }

  /**
   * Handle Tab key - indent/outdent list items
   */
  private _handleTab(shift: boolean): void {
    const currentLineIndex = getLineIndexForPosition(this._document, this._selection.focus);
    const currentListItem = this._document.listItems.get(currentLineIndex);

    if (currentListItem) {
      // Indent or outdent the list item
      if (shift) {
        this._document = outdentListItem(this._document, currentLineIndex);
      } else {
        this._document = indentListItem(this._document, currentLineIndex);
      }
      this._updateLayout();
      this._render();
      this._pushHistory();
    } else {
      // Not in a list item, insert tab character
      this._insertText('\t');
    }
  }

  /**
   * Move caret in a direction
   */
  private _moveCaret(
    direction: 'left' | 'right' | 'up' | 'down' | 'home' | 'end',
    extendSelection: boolean
  ): void {
    const docLength = getDocumentLength(this._document);
    let newFocus = this._selection.focus;

    switch (direction) {
      case 'left':
        if (!extendSelection && this._selection.anchor !== this._selection.focus) {
          newFocus = Math.min(this._selection.anchor, this._selection.focus);
        } else if (newFocus > 0) {
          newFocus--;
        }
        break;

      case 'right':
        if (!extendSelection && this._selection.anchor !== this._selection.focus) {
          newFocus = Math.max(this._selection.anchor, this._selection.focus);
        } else if (newFocus < docLength) {
          newFocus++;
        }
        break;

      case 'up':
      case 'down':
        newFocus = this._moveCaretVertically(direction === 'up');
        break;

      case 'home':
        newFocus = this._getLineStart(this._selection.focus);
        break;

      case 'end':
        newFocus = this._getLineEnd(this._selection.focus);
        break;
    }

    if (extendSelection) {
      this._selection = { ...this._selection, focus: newFocus };
    } else {
      this._selection = { anchor: newFocus, focus: newFocus };
    }

    this._updateCurrentStyle();
    this._render();
    this._resetCaretBlink();
  }

  /**
   * Move caret up or down a line
   */
  private _moveCaretVertically(up: boolean): AbsolutePosition {
    if (!this._layout) return this._selection.focus;

    const currentPos = getCaretPosition(this._layout, this._selection.focus, this._document);
    const currentLine = this._getLineAtY(currentPos.y);

    if (currentLine === -1) return this._selection.focus;

    const targetLineIndex = up ? currentLine - 1 : currentLine + 1;

    if (targetLineIndex < 0 || targetLineIndex >= this._layout.lines.length) {
      return this._selection.focus;
    }

    const targetLine = this._layout.lines[targetLineIndex];
    const targetY = targetLine.y + targetLine.height / 2;

    return hitTest(this._layout, currentPos.x, targetY, this._document);
  }

  /**
   * Get line index at Y coordinate
   */
  private _getLineAtY(y: number): number {
    if (!this._layout) return -1;

    for (let i = 0; i < this._layout.lines.length; i++) {
      const line = this._layout.lines[i];
      if (y >= line.y && y < line.y + line.height) {
        return i;
      }
    }

    return this._layout.lines.length - 1;
  }

  /**
   * Get start position of line containing position
   */
  private _getLineStart(pos: AbsolutePosition): AbsolutePosition {
    if (!this._layout) return 0;

    const caretPos = getCaretPosition(this._layout, pos, this._document);
    const lineIndex = this._getLineAtY(caretPos.y);

    if (lineIndex < 0) return 0;

    const line = this._layout.lines[lineIndex];
    if (line.chars.length === 0) return pos;

    return line.chars[0].char.absoluteIndex;
  }

  /**
   * Get end position of line containing position
   */
  private _getLineEnd(pos: AbsolutePosition): AbsolutePosition {
    if (!this._layout) return getDocumentLength(this._document);

    const caretPos = getCaretPosition(this._layout, pos, this._document);
    const lineIndex = this._getLineAtY(caretPos.y);

    if (lineIndex < 0) return getDocumentLength(this._document);

    const line = this._layout.lines[lineIndex];
    if (line.chars.length === 0) return pos;

    return line.chars[line.chars.length - 1].char.absoluteIndex + 1;
  }

  /**
   * Get word boundaries around a position
   */
  private _getWordBoundaries(pos: AbsolutePosition): { start: number; end: number } {
    if (!this._layout || this._layout.chars.length === 0) {
      return { start: 0, end: 0 };
    }

    const chars = this._layout.chars;
    let start = pos;
    let end = pos;

    // Find start of word
    while (start > 0) {
      const char = chars[start - 1]?.char.char || '';
      if (char === ' ' || char === '\n' || char === '\t') break;
      start--;
    }

    // Find end of word
    while (end < chars.length) {
      const char = chars[end]?.char.char || '';
      if (char === ' ' || char === '\n' || char === '\t') break;
      end++;
    }

    return { start, end };
  }

  /**
   * Copy selected text to clipboard
   */
  private _copySelection(): void {
    const text = getSelectedText(this._document, this._selection);
    if (text) {
      navigator.clipboard.writeText(text).catch(console.error);
    }
  }

  /**
   * Cut selected text
   */
  private _cutSelection(): void {
    this._copySelection();
    if (this._selection.anchor !== this._selection.focus) {
      const { doc, newPosition } = replaceSelection(
        this._document,
        this._selection,
        ''
      );
      this._document = doc;
      this._selection = { anchor: newPosition, focus: newPosition };
      this._updateLayout();
      this._render();
      this._pushHistory();
    }
  }

  /**
   * Get relative pointer position within this node
   */
  private _getRelativePointerPosition(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    _e: any
  ): { x: number; y: number } | null {
    const stage = this.getStage();
    if (!stage) return null;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return null;

    const transform = this.getAbsoluteTransform().copy().invert();
    return transform.point(pointerPos);
  }

  /**
   * Update layout based on current document and dimensions
   */
  private _updateLayout(): void {
    this._layout = layoutText(this._document, this._boxWidth, this._boxHeight);
  }

  /**
   * Render everything to canvas
   */
  private _render(): void {
    if (!this._layout || !this._textImage || !this._borderRect || !this._hitArea) return;

    // Get caret position
    const caretPos = this._isEditing
      ? getCaretPosition(this._layout, this._selection.focus, this._document)
      : null;

    // Render text to offscreen canvas
    const textCanvas = renderTextToCanvas(
      this._layout,
      this._document,
      this._isEditing ? this._selection : null,
      caretPos,
      this._caretVisible && this._isEditing
    );

    // Update Konva image
    this._textImage.image(textCanvas);
    this._textImage.width(this._boxWidth);
    this._textImage.height(this._boxHeight);

    // Update hit area
    this._hitArea.width(this._boxWidth);
    this._hitArea.height(this._boxHeight);

    // Update border
    this._borderRect.width(this._boxWidth);
    this._borderRect.height(this._boxHeight);

    if (this._isEditing) {
      this._borderRect.stroke('#4285f4');
      this._borderRect.strokeWidth(2);
    } else {
      this._borderRect.stroke('transparent');
      this._borderRect.strokeWidth(0);
    }

    // Redraw layer
    const layer = this.getLayer();
    if (layer) {
      layer.batchDraw();
    }
  }

  /**
   * Update current style based on caret position
   */
  private _updateCurrentStyle(): void {
    this._currentStyle = getStyleAtPosition(this._document, this._selection.focus);
  }

  /**
   * Start editing mode
   */
  public startEditing(): void {
    if (this._isEditing) return;

    this._isEditing = true;
    this._caretVisible = true;

    // Add keyboard listeners
    window.addEventListener('keydown', this._boundKeyDownHandler);
    window.addEventListener('keypress', this._boundKeyPressHandler);

    // Setup paste handler
    window.addEventListener('paste', this._handlePaste.bind(this));

    // Start caret blink
    this._startCaretBlink();

    this._updateCurrentStyle();
    this._render();

    this.fire('editstart');
  }

  /**
   * Stop editing mode
   */
  public stopEditing(): void {
    if (!this._isEditing) return;

    this._isEditing = false;
    this._caretVisible = false;
    this._isDraggingSelection = false;

    // Remove keyboard listeners
    window.removeEventListener('keydown', this._boundKeyDownHandler);
    window.removeEventListener('keypress', this._boundKeyPressHandler);
    window.removeEventListener('paste', this._handlePaste.bind(this));

    // Stop caret blink
    this._stopCaretBlink();

    this._render();

    this.fire('editend');
  }

  /**
   * Handle paste event
   */
  private _handlePaste(e: ClipboardEvent): void {
    if (!this._isEditing) return;

    e.preventDefault();

    const text = e.clipboardData?.getData('text/plain') || '';
    if (text) {
      this._insertText(text);
    }
  }

  /**
   * Start caret blinking
   */
  private _startCaretBlink(): void {
    this._stopCaretBlink();
    this._caretBlinkInterval = window.setInterval(() => {
      this._caretVisible = !this._caretVisible;
      this._render();
    }, 530);
  }

  /**
   * Stop caret blinking
   */
  private _stopCaretBlink(): void {
    if (this._caretBlinkInterval) {
      clearInterval(this._caretBlinkInterval);
      this._caretBlinkInterval = null;
    }
  }

  /**
   * Reset caret blink (show caret immediately)
   */
  private _resetCaretBlink(): void {
    this._caretVisible = true;
    this._startCaretBlink();
  }

  /**
   * Push current state to history
   */
  private _pushHistory(): void {
    // Guard against early initialization (before class fields are set)
    if (!this._history) {
      this._history = [];
      this._historyIndex = -1;
    }

    // Remove any future history if we're not at the end
    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1);
    }

    // Add new entry
    this._history.push({
      document: cloneDocument(this._document),
      selection: { ...this._selection },
      timestamp: Date.now(),
    });

    // Limit history size
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    this._historyIndex = this._history.length - 1;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Undo last action
   */
  public undo(): void {
    if (this._historyIndex > 0) {
      this._historyIndex--;
      const entry = this._history[this._historyIndex];
      this._document = cloneDocument(entry.document);
      this._selection = { ...entry.selection };
      this._updateLayout();
      this._render();
    }
  }

  /**
   * Redo last undone action
   */
  public redo(): void {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      const entry = this._history[this._historyIndex];
      this._document = cloneDocument(entry.document);
      this._selection = { ...entry.selection };
      this._updateLayout();
      this._render();
    }
  }

  /**
   * Select all text
   */
  public selectAll(): void {
    const length = getDocumentLength(this._document);
    this._selection = { anchor: 0, focus: length };
    this._render();
  }

  /**
   * Toggle bold on selection
   */
  public toggleBold(): void {
    if (this._selection.anchor === this._selection.focus) {
      // No character selection - apply to ALL text
      const length = getDocumentLength(this._document);
      if (length > 0) {
        this._document = toggleBoldInRange(this._document, 0, length);
        this._updateLayout();
        this._render();
        this._pushHistory();
      }
      // Also update current style for future input
      this._currentStyle.fontWeight =
        this._currentStyle.fontWeight === 'bold' ? 'normal' : 'bold';
    } else {
      const start = Math.min(this._selection.anchor, this._selection.focus);
      const end = Math.max(this._selection.anchor, this._selection.focus);
      this._document = toggleBoldInRange(this._document, start, end);
      this._updateLayout();
      this._render();
      this._pushHistory();
    }
  }

  /**
   * Toggle italic on selection
   */
  public toggleItalic(): void {
    if (this._selection.anchor === this._selection.focus) {
      // No character selection - apply to ALL text
      const length = getDocumentLength(this._document);
      if (length > 0) {
        this._document = toggleItalicInRange(this._document, 0, length);
        this._updateLayout();
        this._render();
        this._pushHistory();
      }
      this._currentStyle.fontStyle =
        this._currentStyle.fontStyle === 'italic' ? 'normal' : 'italic';
    } else {
      const start = Math.min(this._selection.anchor, this._selection.focus);
      const end = Math.max(this._selection.anchor, this._selection.focus);
      this._document = toggleItalicInRange(this._document, start, end);
      this._updateLayout();
      this._render();
      this._pushHistory();
    }
  }

  /**
   * Toggle underline on selection
   */
  public toggleUnderline(): void {
    if (this._selection.anchor === this._selection.focus) {
      // No character selection - apply to ALL text
      const length = getDocumentLength(this._document);
      if (length > 0) {
        this._document = toggleStyleInRange(this._document, 0, length, 'underline');
        this._updateLayout();
        this._render();
        this._pushHistory();
      }
      this._currentStyle.underline = !this._currentStyle.underline;
    } else {
      const start = Math.min(this._selection.anchor, this._selection.focus);
      const end = Math.max(this._selection.anchor, this._selection.focus);
      this._document = toggleStyleInRange(this._document, start, end, 'underline');
      this._updateLayout();
      this._render();
      this._pushHistory();
    }
  }

  /**
   * Apply style to selection
   */
  public applyStyle(style: Partial<TextStyle>): void {
    if (this._selection.anchor === this._selection.focus) {
      // No character selection - apply to ALL text
      const length = getDocumentLength(this._document);
      if (length > 0) {
        this._document = applyStyleToRange(this._document, 0, length, style);
        this._updateLayout();
        this._render();
        this._pushHistory();
      }
      // Also update current style for future input
      this._currentStyle = { ...this._currentStyle, ...style };
    } else {
      const start = Math.min(this._selection.anchor, this._selection.focus);
      const end = Math.max(this._selection.anchor, this._selection.focus);
      this._document = applyStyleToRange(this._document, start, end, style);
      this._updateLayout();
      this._render();
      this._pushHistory();
    }
  }

  /**
   * Set text alignment
   */
  public setAlign(align: 'left' | 'center' | 'right' | 'justify'): void {
    this._document = { ...this._document, align };
    this._updateLayout();
    this._render();
    this._pushHistory();
  }

  /**
   * Toggle bullet list for current line(s)
   */
  public toggleBulletList(): void {
    const startLine = getLineIndexForPosition(this._document, Math.min(this._selection.anchor, this._selection.focus));
    const endLine = getLineIndexForPosition(this._document, Math.max(this._selection.anchor, this._selection.focus));
    this._document = toggleListForLines(this._document, startLine, endLine, 'bullet');
    this._updateLayout();
    this._render();
    this._pushHistory();
  }

  /**
   * Toggle numbered list for current line(s)
   */
  public toggleNumberedList(): void {
    const startLine = getLineIndexForPosition(this._document, Math.min(this._selection.anchor, this._selection.focus));
    const endLine = getLineIndexForPosition(this._document, Math.max(this._selection.anchor, this._selection.focus));
    this._document = toggleListForLines(this._document, startLine, endLine, 'number');
    this._updateLayout();
    this._render();
    this._pushHistory();
  }

  /**
   * Get current document
   */
  public getDocument(): RichTextDocument {
    return cloneDocument(this._document);
  }

  /**
   * Set document
   */
  public setDocument(doc: RichTextDocument): void {
    this._document = cloneDocument(doc);
    this._selection = { anchor: 0, focus: 0 };

    // Guard against being called from Konva's super() before initialization
    if (this._hitArea) {
      this._updateLayout();
      this._render();
      this._pushHistory();
    }
  }

  /**
   * Get plain text content
   */
  public getText(): string {
    return this._document.spans.map((s) => s.text).join('');
  }

  /**
   * Get placeholder text
   */
  public getPlaceholder(): string {
    return this._placeholder;
  }

  /**
   * Set placeholder text
   */
  public setPlaceholder(placeholder: string): void {
    this._placeholder = placeholder;
  }

  /**
   * Set plain text (replaces all content)
   */
  public setText(text: string): void {
    this._document = {
      ...this._document,
      spans: [
        {
          id: `span_${Date.now()}`,
          text,
          style: { ...DEFAULT_STYLE },
        },
      ],
    };
    this._selection = { anchor: text.length, focus: text.length };
    this._updateLayout();
    this._render();
    this._pushHistory();
  }

  /**
   * Get box dimensions
   */
  public getBoxSize(): { width: number; height: number } {
    return { width: this._boxWidth, height: this._boxHeight };
  }

  /**
   * Set box dimensions
   */
  public setBoxSize(width: number, height: number): void {
    this._boxWidth = Math.max(this._minWidth, width);
    this._boxHeight = Math.max(this._minHeight, height);
    this._updateLayout();
    this._render();
  }

  /**
   * Check if currently editing
   */
  public isEditing(): boolean {
    return this._isEditing;
  }

  /**
   * Get current selection
   */
  public getSelection(): Selection {
    return { ...this._selection };
  }

  /**
   * Clean up resources
   */
  public destroy(): this {
    this.stopEditing();
    this._stopCaretBlink();
    return super.destroy();
  }
}
