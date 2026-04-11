import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core';

type SlashMenuItem = {
  key: string;
  title: string;
  onItemClick: () => void;
  subtext?: string;
  aliases?: string[];
  group?: string;
  badge?: string;
  icon?: string;
};

export function getCustomSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>
): SlashMenuItem[] {
  return [
    // === Media (not in default menu) ===
    {
      key: 'image',
      title: 'Image',
      subtext: 'Insert an image',
      aliases: ['img', 'picture', 'photo'],
      group: 'Media',
      icon: '🖼️',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'image' as any }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      key: 'video',
      title: 'Video',
      subtext: 'Embed a video',
      aliases: ['video', 'youtube', 'embed'],
      group: 'Media',
      icon: '🎬',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'video' as any }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },

    // === Advanced (custom blocks) ===
    {
      key: 'callout',
      title: 'Callout',
      subtext: 'Highlight important info',
      aliases: ['callout', 'alert', 'notice', 'info'],
      group: 'Advanced',
      icon: '💡',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'callout' as any, props: { type: 'info' } }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      key: 'code_block',
      title: 'Code Block',
      subtext: 'Insert a code snippet',
      aliases: ['code', 'codeblock', 'pre'],
      group: 'Advanced',
      icon: '💻',
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: 'codeBlock' as any }],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
    },
    {
      key: 'table',
      title: 'Table',
      subtext: 'Insert a table',
      aliases: ['table', 'grid'],
      group: 'Advanced',
      icon: '📊',
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
  items: SlashMenuItem[],
  query: string
): SlashMenuItem[] {
  return filterSuggestionItems(items, query);
}
