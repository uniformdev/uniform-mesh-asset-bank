import {
  Button,
  HorizontalRhythm,
  Image,
  ImageBroken,
  Link,
  VerticalRhythm,
  DescriptionList,
  ScrollableList,
  Details,
  InputSelect,
  LoadingIndicator,
  Icon,
  useShortcut,
  getFormattedShortcut,
} from '@uniformdev/design-system';

import {
  Asset,
  buildAssetTransformerUrl,
  FILE_FORMAT_IMAGE,
  ImageSizeRequestPayload,
  ImageSizeResponsePayload,
  IntegrationSettings,
  resolveMimeType,
} from '@lib';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useIntegrationSettings } from '@hooks';
import { css } from '@emotion/react';
import { useUpdateEffect } from 'react-use';

const FILE_FORMATS_OPTIONS = [
  { label: 'JPEG', value: '' },
  { label: 'PNG', value: 'png' },
  { label: 'WEBP', value: 'webp' },
];

const IMAGE_QUALITY_OPTIONS = [
  { label: 'Default', value: '' },
  { label: '100%', value: '100' },
  { label: '90%', value: '90' },
  { label: '80%', value: '80' },
  { label: '70%', value: '70' },
  { label: '60%', value: '60' },
  { label: '50%', value: '50' },
  { label: '40%', value: '40' },
  { label: '30%', value: '30' },
  { label: '20%', value: '20' },
  { label: '10%', value: '10' },
];

type AssetPreviewProps = {
  mode: 'library' | 'parameter';
  asset: Asset;
  onAssetSelect: (asset: Asset) => void;
  onClose?: () => void;
};

export const AssetPreview = ({ mode, asset, onAssetSelect, onClose }: AssetPreviewProps) => {
  const settings = useIntegrationSettings(true);

  const [preset, setPreset] = useState<string>(
    asset.availableToAssetTransformer ? (settings.assetTransformerPresets?.at(0) ?? '') : ''
  );
  const [fileFormat, setFileFormat] = useState<string>(FILE_FORMATS_OPTIONS[0].value);
  const [imageQuality, setImageQuality] = useState<string>(IMAGE_QUALITY_OPTIONS[0].value);

  const [dynamicMetadata, setDynamicMetadata] = useState<Pick<Asset, 'width' | 'height' | 'size'>>();

  const mergeAsset = useCallback(
    (asset: Asset) => {
      // ignore metadata props on asset update, we should resolve metadata on asset load
      const { width, height, size, ...assetProps } = asset;

      return {
        ...assetProps,
        ...dynamicMetadata,
        mimeType: resolveMimeType(`${asset.name}.${fileFormat || 'jpg'}`),
        uniformUrl: buildUniformUrl({ asset, settings, preset, fileFormat, imageQuality }),
      };
    },
    [settings, preset, fileFormat, imageQuality, dynamicMetadata]
  );

  const [currentAsset, setCurrentAsset] = useState<Asset>(mergeAsset(asset));

  useUpdateEffect(() => {
    setCurrentAsset((prev) =>
      mergeAsset({
        ...prev,
        ...asset,
      })
    );
  }, [asset, mergeAsset]);

  const attributes = useMemo(() => {
    return (
      currentAsset.attributes
        ?.filter((attr) => !!attr.value)
        .sort((a, b) => a.id - b.id)
        .map((attr) => ({
          label: attr.label ?? attr.name,
          value: attr.value,
        })) ?? []
    );
  }, [currentAsset.attributes]);

  const updateAssetMetadata = useCallback((updates: { width?: number; height?: number; size?: number }) => {
    setDynamicMetadata((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const { editUrl, assetTransformerAttributeUrl } = useMemo(
    () => ({
      editUrl: `${settings.apiHost}/action/viewAsset?id=${currentAsset.id}`,
      assetTransformerAttributeUrl: `${settings.apiHost}/action/viewUpdateAsset?id=${currentAsset.id}#field710`,
    }),
    [settings.apiHost, currentAsset.id]
  );

  const closeShortcut = useShortcut({
    shortcut: 'esc',
    macShortcut: 'esc',
    handler: () => onClose?.(),
  });

  const isAssetTransformerSupported =
    currentAsset.availableToAssetTransformer && currentAsset.fileFormat === FILE_FORMAT_IMAGE;

  return (
    <HorizontalRhythm gap="sm" style={{ display: 'grid', gridTemplateColumns: '7fr 5fr' }}>
      <VerticalRhythm style={{ maxHeight: '100vh' }} justify="center" align="center">
        <MediaPreview
          asset={currentAsset}
          updateAssetMetadata={mode === 'parameter' ? updateAssetMetadata : undefined}
        />
      </VerticalRhythm>
      <VerticalRhythm
        gap="sm"
        style={{ maxHeight: '100vh', padding: 'var(--spacing-xs)', wordBreak: 'break-word' }}
      >
        <HorizontalRhythm
          gap="md"
          align="center"
          justify="space-between"
          style={{ paddingTop: 'var(--spacing-sm)' }}
        >
          <HorizontalRhythm gap="md" align="center">
            {mode === 'parameter' ? (
              <SelectAssetButton
                asset={currentAsset}
                onClick={() => onAssetSelect(currentAsset)}
                assetTransformerAttributeUrl={assetTransformerAttributeUrl}
              />
            ) : null}
            <Link text="Open in Asset Bank" href={editUrl || '#'} external />
          </HorizontalRhythm>

          {onClose ? (
            <Button
              type="button"
              onClick={onClose}
              buttonType="ghost"
              tooltip={getFormattedShortcut(closeShortcut.shortcut)}
              tooltipOptions={{
                gutter: 0,
              }}
              style={{ alignSelf: 'flex-end' }}
            >
              <Icon icon="close" iconColor="currentColor" size={24} />
            </Button>
          ) : null}
        </HorizontalRhythm>
        {isAssetTransformerSupported ? (
          <>
            <InputSelect
              name="preset"
              label="Preset"
              options={settings.assetTransformerPresets?.map((id) => ({ label: id, value: id })) ?? []}
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            />
            <InputSelect
              name="fileFormat"
              label="File Format"
              options={FILE_FORMATS_OPTIONS}
              value={fileFormat ?? ''}
              onChange={(e) => setFileFormat(e.target.value ?? '')}
            />
            <InputSelect
              name="imageQuality"
              label="Image Quality"
              options={IMAGE_QUALITY_OPTIONS}
              value={imageQuality ?? ''}
              onChange={(e) => setImageQuality(e.target.value ?? '')}
            />
          </>
        ) : null}
        <Details summary="Asset Details" isCompact isOpenByDefault={!isAssetTransformerSupported}>
          <ScrollableList>
            <DescriptionList items={attributes} variant="vertical" />
          </ScrollableList>
        </Details>
      </VerticalRhythm>
    </HorizontalRhythm>
  );
};

const buildUniformUrl = ({
  asset,
  preset,
  fileFormat,
  imageQuality,
  settings,
}: {
  asset: Asset;
  preset: string;
  fileFormat: string;
  imageQuality: string;
  settings: IntegrationSettings;
}): string => {
  if (!asset.availableToAssetTransformer || asset.fileFormat !== FILE_FORMAT_IMAGE) {
    return asset.uniformUrl ?? '';
  }

  return buildAssetTransformerUrl({
    assetTransformerUrl: settings.assetTransformerUrl ?? '',
    assetId: asset.id,
    preset,
    fileFormat,
    imageQuality,
  });
};

const SelectAssetButton = ({
  asset,
  onClick,
  assetTransformerAttributeUrl,
}: {
  asset: Asset;
  onClick: () => void;
  assetTransformerAttributeUrl: string;
}) => {
  const tooltip = useMemo(() => {
    if (asset.fileFormat !== FILE_FORMAT_IMAGE) {
      return (
        <span>
          Asset Transformer supports only <b>Image</b> assets.
        </span>
      );
    }

    if (!asset.availableToAssetTransformer) {
      return (
        <VerticalRhythm gap="xs">
          <div>Asset Transformer is not enabled for this asset.</div>
          <div>
            Set <b>Available to Asset Transformer</b> attribute to <b>Yes</b>.
          </div>
          <Link text="Open in Asset Bank" href={assetTransformerAttributeUrl || '#'} external />
        </VerticalRhythm>
      );
    }

    const waitingForMetadata =
      asset.width === undefined || asset.height === undefined || asset.size === undefined;
    if (waitingForMetadata) {
      return <span>Waiting for asset to load to provide proper metadata</span>;
    }

    return null;
  }, [
    asset.fileFormat,
    asset.availableToAssetTransformer,
    asset.width,
    asset.height,
    asset.size,
    assetTransformerAttributeUrl,
  ]);

  return (
    <Button type="button" buttonType="secondary" disabled={!!tooltip} onClick={onClick} tooltip={tooltip}>
      Select Asset
    </Button>
  );
};

const mediaPreviewStyles = css`
  flex-grow: 1;
  background: var(--gray-50);
  display: flex;
  height: 100%;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: var(--spacing-base);
  overflow: hidden;

  video {
    width: 100%;
    height: auto;
  }

  img {
    object-fit: scale-down;
  }
`;

const MediaPreview = ({
  asset,
  updateAssetMetadata,
}: {
  asset: Asset;
  updateAssetMetadata?: (updates: { width?: number; height?: number; size?: number }) => void;
}) => {
  const [mediaPlaybackError, setMediaPlaybackError] = useState<boolean>(false);

  if (!asset.fileFormat || mediaPlaybackError || !asset.uniformUrl) {
    return <ImageBroken />;
  }

  if (asset.fileFormat === FILE_FORMAT_IMAGE) {
    const imageUrl = asset.availableToAssetTransformer ? asset.uniformUrl : (asset.previewUrl ?? '');
    return <ImagePreview alt={asset.name} src={imageUrl} updateAssetMetadata={updateAssetMetadata} />;
  }

  if (asset.fileFormat === 'Video') {
    return (
      <div css={mediaPreviewStyles}>
        <video controls src={asset.uniformUrl} onError={() => setMediaPlaybackError(true)} />
      </div>
    );
  }

  if (asset.fileFormat === 'Audio') {
    return (
      <div css={mediaPreviewStyles}>
        <audio controls src={asset.uniformUrl} onError={() => setMediaPlaybackError(true)} />
      </div>
    );
  }

  if (asset.previewUrl) {
    return <ImagePreview alt={asset.name} src={asset.previewUrl} updateAssetMetadata={updateAssetMetadata} />;
  }

  return <ImageBroken />;
};

const ImagePreview = ({
  src,
  alt,
  updateAssetMetadata,
}: {
  src: string;
  alt: string;
  updateAssetMetadata?: (updates: { width?: number; height?: number; size?: number }) => void;
}) => {
  const imageElementId = useId();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Uncached images loading may take up to 10s, let's show loading indicator for them
  useEffect(() => {
    // reset size on `src` change
    updateAssetMetadata?.({ width: undefined, height: undefined, size: undefined });

    // `Image` component overrides `onLoad` and `onError` event listeners and doesn't support `ref`
    const image = document.getElementById(imageElementId) as HTMLImageElement;
    if (!image) {
      return;
    }

    const controller = new AbortController();
    controller.signal.addEventListener('abort', () => clearTimeout(timeout));

    const updateMediaMetadata = updateAssetMetadata
      ? () => {
          updateAssetMetadata({ width: image.naturalWidth, height: image.naturalHeight });
          getImageSize(src, controller.signal).then((size) => {
            if (size > 0) {
              updateAssetMetadata({ size });
            }
          });
        }
      : null;

    // cached images don't fire `load` event
    if (image.complete) {
      setIsLoading(false);
      updateMediaMetadata?.();
      return;
    }

    image.addEventListener(
      'load',
      () => {
        setIsLoading(false);
        updateMediaMetadata?.();
      },
      { signal: controller.signal }
    );
    image.addEventListener('error', () => setIsLoading(false), { signal: controller.signal });

    // show delayed loading indicator
    const timeout = setTimeout(() => {
      if (!image.complete) {
        setIsLoading(true);
      }
    }, 500);

    return () => controller.abort('useEffect');
  }, [imageElementId, src, updateAssetMetadata]);

  return (
    <VerticalRhythm gap="xs" align="center" justify="center" style={{ height: '100%' }}>
      {isLoading ? <LoadingIndicator title="Waiting for image generation..." /> : null}
      <Image
        id={imageElementId}
        alt={alt}
        src={src}
        style={{
          display: isLoading ? 'none' : undefined,
          objectFit: 'scale-down',
          height: '100%',
          width: '100%',
        }}
      />
    </VerticalRhythm>
  );
};

const getImageSize = async (imageUrl: string, signal: AbortSignal): Promise<number> => {
  const payload: ImageSizeRequestPayload = {
    imageUrl,
  };

  const response = await fetch('/api/image-size', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  });

  const result: ImageSizeResponsePayload = await response.json();
  return result.size;
};
