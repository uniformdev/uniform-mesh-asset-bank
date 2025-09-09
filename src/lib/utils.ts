import { v4 } from 'uuid';

import mime from 'mime-types';

import {
  Asset,
  SearchEntry,
  IntegrationSettings,
  SearchEntryPreview,
  SingleAssetApiResult,
  FileFormat,
  WELL_KNOWN_ATTRIBUTES,
} from '@lib';

import { AssetDefinitionType, AssetParamValueItem } from '@uniformdev/assets';
import { integrationSettingsSchema } from './types';

export const validateSettings = (settings: IntegrationSettings | null | undefined): boolean => {
  return integrationSettingsSchema.safeParse(settings).success;
};

export const mapSearchEntryToPreview = ({ entry }: { entry: SearchEntry }): SearchEntryPreview => {
  const name =
    entry.displayAttributes?.find((attr) => attr.label === WELL_KNOWN_ATTRIBUTES.title.label)?.value ??
    'Untitled';

  const fileFormat = entry.displayAttributes?.find(
    (attr) => attr.label === WELL_KNOWN_ATTRIBUTES.fileFormat.label
  )?.value;

  const mimeType = resolveMimeType(entry.originalFilename);

  return {
    id: String(entry.id),
    name,
    fileFormat: fileFormat as FileFormat,
    mimeType,
    thumbnailUrl: entry.thumbnailUrl,
    previewUrl: entry.previewUrl,
  };
};

export const mapSingleAssetResultToPreview = ({ asset }: { asset: SingleAssetApiResult }): Asset | null => {
  const attributes: Record<string, string | undefined> = (asset.attributes ?? [])
    .filter((attr) => !!attr.value)
    .reduce<Record<string, string>>((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {});

  const id = attributes[WELL_KNOWN_ATTRIBUTES.assetId.name];
  if (!id) {
    return null;
  }

  const name = attributes[WELL_KNOWN_ATTRIBUTES.title.name] ?? 'Unknown Title';
  const description = attributes[WELL_KNOWN_ATTRIBUTES.description.name] ?? '';
  const fileFormat = attributes[WELL_KNOWN_ATTRIBUTES.fileFormat.name];
  const size = attributes[WELL_KNOWN_ATTRIBUTES.size.name];
  const altText = attributes[WELL_KNOWN_ATTRIBUTES.altText.name];
  const originalFilename = attributes[WELL_KNOWN_ATTRIBUTES.originalFilename.name];

  const availableToAssetTransformer =
    attributes[WELL_KNOWN_ATTRIBUTES.availableToAssetTransformer.name] === 'Yes';

  return {
    ...asset,
    id,
    type: asset.type,
    name,
    description,
    altText,
    originalFilename,
    fileFormat: fileFormat as FileFormat | undefined,
    size: size && Number(size) > 0 ? Number(size) : undefined,
    availableToAssetTransformer,
    uniformUrl: '',
  };
};

export const mapAssetToAssetParamValue = ({
  asset,
  sourceId,
  uniformAssetAttributes,
}: {
  asset: Asset;
  sourceId: string;
  uniformAssetAttributes: number[];
}): AssetParamValueItem => {
  const type = resolveAssetType(asset.fileFormat);

  const description = asset.altText || asset.description;

  return {
    type,
    _id: v4(),
    _source: sourceId,
    fields: {
      url: {
        type: 'text',
        value: asset.uniformUrl,
      },
      id: {
        type: 'text',
        value: asset.id,
      },
      mediaType: asset?.mimeType
        ? {
            type: 'text',
            value: asset?.mimeType,
          }
        : undefined,
      title: {
        type: 'text',
        value: asset.name,
      },
      description: description
        ? {
            type: 'text',
            value: description,
          }
        : undefined,
      width: asset.width
        ? {
            type: 'number',
            value: asset.width,
          }
        : undefined,
      height: asset.height
        ? {
            type: 'number',
            value: asset.height,
          }
        : undefined,
      size: asset.size
        ? {
            type: 'number',
            value: asset.size,
          }
        : undefined,
      custom: {
        type: 'asset-bank',
        value:
          asset.attributes
            ?.filter((attr) => uniformAssetAttributes.includes(attr.id) && !!attr.value)
            .reduce(
              (acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              },
              {} as Record<string, string>
            ) ?? {},
      },
    },
  };
};

const resolveAssetType = (fileFormat: FileFormat | undefined): AssetDefinitionType => {
  if (!fileFormat) {
    return 'other';
  }

  switch (fileFormat) {
    case 'Image':
      return 'image';
    case 'Audio':
      return 'audio';
    case 'Video':
      return 'video';
    case 'Design File':
      return 'other';
    case 'Document':
      return 'other';
    default:
      return 'other';
  }
};

export const resolveMimeType = (fileNameWithExt: string | undefined): string => {
  if (!fileNameWithExt) {
    return '';
  }

  const mimeType = mime.lookup(fileNameWithExt);
  return typeof mimeType === 'string' ? mimeType : '';
};

export const buildAssetTransformerUrl = ({
  assetId,
  assetTransformerUrl,
  preset,
  fileFormat,
  imageQuality,
}: {
  assetId: string;
  assetTransformerUrl: string;
  preset: string;
  fileFormat?: string;
  imageQuality?: string;
}) => {
  if (!assetTransformerUrl || !preset || !assetId) {
    return '';
  }

  const baseUrl = assetTransformerUrl.endsWith('/') ? assetTransformerUrl.slice(0, -1) : assetTransformerUrl;

  return `${baseUrl}/conversion/${preset}/assets/${assetId}${fileFormat ? `.${fileFormat}` : ''}${
    imageQuality ? `?q=${imageQuality}` : ''
  }`;
};
