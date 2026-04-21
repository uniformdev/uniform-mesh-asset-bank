import { useState } from 'react';
import { Icon } from '@uniformdev/design-system';

type FolderCardProps = {
  name: string;
  childCount?: number;
  onClick: () => void;
};

export function FolderCard({ name, childCount, onClick }: FolderCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={childCount ? `Contains ${childCount} child folder${childCount === 1 ? '' : 's'}` : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 8px',
        background: hovered ? 'var(--gray-50)' : 'var(--white)',
        border: `1px solid ${hovered ? 'var(--gray-300)' : 'var(--gray-100)'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        width: '100%',
        minWidth: 0,
        textAlign: 'center',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {childCount ? (
        <span
          style={{
            position: 'absolute',
            top: '4px',
            right: '5px',
            fontSize: '0.6rem',
            background: 'var(--gray-200)',
            color: 'var(--gray-500)',
            borderRadius: '999px',
            padding: '1px 5px',
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {childCount}
        </span>
      ) : null}
      <Icon icon="folder" size="1.5rem" iconColor={hovered ? 'action' : 'gray300'} />
      <span
        style={{
          fontSize: '0.75rem',
          color: 'var(--gray-700)',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          width: '100%',
        }}
      >
        {name}
      </span>
    </button>
  );
}
