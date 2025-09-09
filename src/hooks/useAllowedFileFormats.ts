import { ASSET_FILE_FORMATS, FileFormat } from '@lib';
import { AssetDefinitionType } from '@uniformdev/assets';
import { useMemo } from 'react';

export const useAllowedFileFormats = (allowedAssetTypes: AssetDefinitionType[] | undefined): FileFormat[] => {
  return useMemo(() => {
    // no restrictions - allow all asset schemes
    if (!allowedAssetTypes?.length) {
      return ASSET_FILE_FORMATS;
    }

    const result: FileFormat[] = [];

    if (allowedAssetTypes.includes('image')) {
      result.push('Image');
    }
    if (allowedAssetTypes.includes('audio')) {
      result.push('Audio');
    }
    if (allowedAssetTypes.includes('video')) {
      result.push('Video');
    }
    if (allowedAssetTypes.includes('other')) {
      result.push('Design File');
      result.push('Document');
      result.push('Other');
    }

    return result;
  }, [allowedAssetTypes]);
};
