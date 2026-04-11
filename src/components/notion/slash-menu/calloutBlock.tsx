import { defaultProps } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';

export const calloutTypes = [
  { title: 'Info', value: 'info' as const, icon: 'ℹ️', color: 'hsl(var(--primary))', bg: 'hsl(var(--primary) / 0.08)', border: 'hsl(var(--primary) / 0.4)' },
  { title: 'Warning', value: 'warning' as const, icon: '⚠️', color: 'hsl(38 92% 50%)', bg: 'hsl(38 92% 50% / 0.08)', border: 'hsl(38 92% 50% / 0.4)' },
  { title: 'Success', value: 'success' as const, icon: '✅', color: 'hsl(142 71% 45%)', bg: 'hsl(142 71% 45% / 0.08)', border: 'hsl(142 71% 45% / 0.4)' },
  { title: 'Error', value: 'error' as const, icon: '❌', color: 'hsl(0 72% 51%)', bg: 'hsl(0 72% 51% / 0.08)', border: 'hsl(0 72% 51% / 0.4)' },
] as const;

export const CalloutBlock = createReactBlockSpec(
  {
    type: 'callout' as const,
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: 'info' as const,
        values: ['info', 'warning', 'success', 'error'] as const,
      },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const calloutType = calloutTypes.find(
        (t) => t.value === props.block.props.type
      ) || calloutTypes[0];

      return (
        <div
          className="flex items-start gap-2 rounded-md transition-colors duration-200"
          style={{
            padding: '12px 16px',
            backgroundColor: calloutType.bg,
            borderLeft: `4px solid ${calloutType.border}`,
          }}
        >
          <span
            className="cursor-pointer select-none shrink-0 mt-0.5 text-lg hover:scale-110 transition-transform duration-150"
            contentEditable={false}
            title="Click to change type"
            onClick={() => {
              const currentIdx = calloutTypes.findIndex(t => t.value === props.block.props.type);
              const nextIdx = (currentIdx + 1) % calloutTypes.length;
              props.editor.updateBlock(props.block, {
                props: { type: calloutTypes[nextIdx].value },
              });
            }}
          >
            {calloutType.icon}
          </span>
          <div className="flex-1 min-w-0" ref={props.contentRef} />
        </div>
      );
    },
  }
);
