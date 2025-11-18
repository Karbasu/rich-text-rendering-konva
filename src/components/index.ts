// ============================================================================
// Components - Reusable Konva Components
// ============================================================================

export { RichText } from './RichText';
export type { RichTextConfig } from './RichText';

// Re-export types from rich-text for convenience
export type {
  RichTextDocument,
  TextStyle,
  TextSpan,
  ListItem,
  Selection,
} from '../rich-text/types';

export {
  createEmptyDocument,
  createDocument,
  DEFAULT_STYLE,
} from '../rich-text';
