import React from 'react';
import { useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { Asset, ALLOWED_FILE_FORMATS, mapAssetToAssetParamValue } from '@lib';
import { AssetLibrary } from '@components/AssetLibrary';
import { useIntegrationSettings } from '@hooks';

export default function AssetParameterLocation() {
  const { metadata, setValue } = useMeshLocation('assetParameter');

  const settings = useIntegrationSettings(true);

  // For now we only support `Image` file format
  // const allowedFileFormats = useAllowedFileFormats(metadata.allowedAssetTypes);

  const onAssetsSelected = React.useCallback(
    (assetBankAssets: Asset[]) => {
      const assets = assetBankAssets.map((asset) =>
        mapAssetToAssetParamValue({
          asset: asset,
          sourceId: metadata.sourceId,
          uniformAssetAttributes: settings.uniformAssetAttributes?.map((a) => a.id) ?? [],
        })
      );

      setValue(() => ({ newValue: assets }));
    },
    [setValue, metadata.sourceId, settings.uniformAssetAttributes]
  );

  return (
    <AssetLibrary
      mode="parameter"
      allowedFileFormats={ALLOWED_FILE_FORMATS}
      onAssetsSelected={onAssetsSelected}
    />
  );
}
