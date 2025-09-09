import React from 'react';

import { ALLOWED_FILE_FORMATS } from '@lib';
import { AssetLibrary } from '@components/AssetLibrary';

export default function AssetLibraryLocation() {
  return <AssetLibrary mode="library" allowedFileFormats={ALLOWED_FILE_FORMATS} />;
}
