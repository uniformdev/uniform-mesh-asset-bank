import { HorizontalRhythm } from '@uniformdev/design-system';

import { SearchEntryPreview } from '@lib';

export const AssetFileProperties = ({ asset }: { asset: SearchEntryPreview }) => {
  const mediaType = asset.mimeType?.split('/').at(1);

  return (
    <HorizontalRhythm gap="sm" align="center" style={{ minWidth: 0 }}>
      <small>
        <strong>Type:</strong> {asset.fileFormat || 'unknown'}
      </small>
      {mediaType ? (
        <small>
          <strong>Media type:</strong> {mediaType}
        </small>
      ) : null}
    </HorizontalRhythm>
  );
};
