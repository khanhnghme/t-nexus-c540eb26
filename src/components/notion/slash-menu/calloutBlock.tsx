import { defaultProps } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';

export const calloutTypes = [
  { title: 'Info', value: 'info' as const, icon: 'ℹ️', color: '#2563eb', bg: '#eff6ff' },
  { title: 'Warning', value: 'warning' as const, icon: '⚠️', color: '#d97706', bg: '#fffbeb' },
  { title: 'Success', value: 'success' as const, icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  { title: 'Error', value: 'error' as const, icon: '❌', color: '#dc2626', bg: '#fef2f2' },
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
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: calloutType.bg,
            borderLeft: `4px solid ${calloutType.color}`,
          }}
        >
          <span
            style={{ cursor: 'pointer', fontSize: '18px', userSelect: 'none', flexShrink: 0, marginTop: '2px' }}
            contentEditable={false}
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
          <div style={{ flex: 1 }} ref={props.contentRef} />
        </div>
      );
    },
  }
);
