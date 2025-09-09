import * as z from 'zod';
import { Session } from 'next-auth';

import { FILE_FORMAT_IMAGE, FileFormat, MediaType, WELL_KNOWN_ATTRIBUTES } from '@lib';

export const integrationSettingsSchema = z.object({
  apiHost: z.url(),
  assetTransformerUrl: z.url(),
  assetTransformerPresets: z.array(z.string()).min(1, { error: 'Requires at least one preset' }),
  rateLimit: z.number(),
  attributes: z
    .array(
      z.object({
        id: z.number(),
        label: z.string(),
        typeId: z.number(),
        listValues: z.array(
          z.object({
            value: z.string(),
            label: z.string().optional(),
          })
        ),
      })
    )
    .refine(
      (attributes) => attributes.find((attr) => attr.label === WELL_KNOWN_ATTRIBUTES.fileFormat.label),
      { error: 'Required "File Format" attribute is missing, resync metadata' }
    )
    .refine(
      (attributes) =>
        attributes
          .find((attr) => attr.label === WELL_KNOWN_ATTRIBUTES.fileFormat.label)
          ?.listValues.some((x) => x.value === FILE_FORMAT_IMAGE),
      {
        error: `"File Format" attribute is missing "${FILE_FORMAT_IMAGE}" value in the list of possible options`,
      }
    ),
  folders: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      path: z.string(),
    })
  ),
  uniformAssetAttributes: z.array(
    z.object({
      id: z.number(),
      label: z.string(),
    })
  ),
  rootFolder: z
    .object({
      id: z.number(),
      name: z.string(),
      path: z.string(),
    })
    .optional(),
});

// In UI components, we should handle the case when settings have not been defined at all
export const integrationSettingsSchemaRaw = integrationSettingsSchema.partial();

export type IntegrationSettings = z.infer<typeof integrationSettingsSchemaRaw>;
export type IntegrationSettingsValidated = z.infer<typeof integrationSettingsSchema>;

export type OAuthSession = Session & {
  tenant: string;
  accessToken: string;
};

// just in case we need to add more tenants
export type OAuthTenant = 'assetbank.app';

export type SelectOption = {
  label: string;
  value: string;
};

export type Asset = {
  id: string;
  type: MediaType;
  name: string;
  description: string;
  altText?: string;
  originalFilename?: string;
  fileFormat?: FileFormat;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  /** a link to the Asset Content resource. This resource is a redirect from Asset Bank to the S3 location of the Asset file, from where it is downloaded.*/
  contentUrl?: string;
  /** a link to the Asset Content resource. This resource is a redirect from Asset Bank to the S3 location of the Asset file, from where it is downloaded.*/
  contentUrlUrl?: string;
  /** a direct link to the Asset file in Asset Bank that does not redirect to the location of the file.*/
  displayUrl?: string;
  /** a link that redirects to the location of the Asset thumbnail in S3, from where it is downloaded. This is at most a 260x260 image.*/
  thumbnailUrl?: string;
  /** a link that redirects to the location of a larger Asset thumbnail in S3, from where it is downloaded. This is at most a 480x480 image.*/
  previewUrl?: string;
  /** a link to the Asset Conversion resource. This resource does an on-the-fly conversion of the original Asset.*/
  conversionUrl?: string;
  /** a link that redirects to the location of the largest Asset thumbnail in S3, from where it is downloaded. This is at most a 1300x1300 image.*/
  unwatermarkedLargeImageUrl?: string;
  /** a list of Attributes and their values for the given Asset.*/
  attributes?: Array<{
    id: number;
    name: string;
    label?: string;
    value: string;
  }>;
  availableToAssetTransformer?: boolean;
  uniformUrl: string;
};

// Asset Bank supports various image formats
export type AssetBankImageFormat = 'JPG' | 'PNG' | 'GIF' | 'WEBP' | 'TIFF';

export type AssetPreviewDialog = {
  params: {
    mode: 'library' | 'parameter';
    id: string;
  };
  result: {
    asset?: Asset;
  };
};

export type AssetBankSearchFilters = {
  keyword?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  uploadedBy?: string;
  approvalStatus?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type ApiRequestPayload = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiUrl: string;
  token: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
};

export type ImageSizeRequestPayload = {
  imageUrl: string;
};

export type ImageSizeResponsePayload = {
  size: number;
};

export type FetchStatusRequestPayload = {
  url: string;
};
