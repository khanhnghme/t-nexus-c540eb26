import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core';
import type { DefaultSuggestionItem } from '@blocknote/core';

export function getCustomSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>
): DefaultSuggestionItem[] {
  return [
    // === Basic ===
    {
      title: 'Heading 1',
      subtext: 'Large section heading',
      aliases: ['h1', 'heading1'],
      group: 'Headings',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'heading', props: { level: 1 } }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      title: 'Heading 2',
      subtext: 'Medium section heading',
      aliases: ['h2', 'heading2'],
      group: 'Headings',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'heading', props: { level: 2 } }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      title: 'Heading 3',
      subtext: 'Small section heading',
      aliases: ['h3', 'heading3'],
      group: 'Headings',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'heading', props: { level: 3 } }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      title: 'Paragraph',
      subtext: 'Plain text block',
      aliases: ['p', 'text'],
      group: 'Basic blocks',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'paragraph' }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      title: 'Bullet List',
      subtext: 'Unordered list item',
      aliases: ['ul', 'bullet', 'list'],
      group: 'Basic blocks',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'bulletListItem' }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      title: 'Numbered List',
      subtext: 'Ordered list item',
      aliases: ['ol', 'numbered', 'list'],
      group: 'Basic blocks',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'numberedListItem' }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },

    // === Media ===
    {
      title: 'Image',
      subtext: 'Insert an image',
      aliases: ['img', 'picture', 'photo'],
      group: 'Media',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'image' as any }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      title: 'Video',
      subtext: 'Embed a video',
      aliases: ['video', 'youtube', 'embed'],
      group: 'Media',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'video' as any }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },

    // === Advanced ===
    {
      title: 'Callout',
      subtext: 'Highlight important info',
      aliases: ['callout', 'alert', 'notice', 'info'],
      group: 'Advanced',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'callout' as any, props: { type: 'info' } }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      title: 'Code Block',
      subtext: 'Insert a code snippet',
      aliases: ['code', 'codeblock', 'pre'],
      group: 'Advanced',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'codeBlock' as any }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },

    // === Table ===
    {
      title: 'Table',
      subtext: 'Insert a table',
      aliases: ['table', 'grid'],
      group: 'Advanced',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'table' as any }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
  ];
}

export function filterSlashMenuItems(
  items: DefaultSuggestionItem[],
  query: string
): DefaultSuggestionItem[] {
  return filterSuggestionItems(items, query);
}
