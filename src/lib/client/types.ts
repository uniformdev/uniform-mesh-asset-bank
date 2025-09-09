export type MediaType = 'Image' | 'Video' | 'Audio' | 'File';

export type FileFormat = 'Image' | 'Video' | 'Audio' | 'Document' | 'Design File' | 'Other';

export type SearchApiResult = SearchEntry[];

export type SearchEntry = {
  id: number;
  originalFilename?: string;
  fullAssetUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  attributes: Array<{
    name: string;
    value: string;
  }>;
  displayAttributes: Array<{
    label: string;
    value: string;
  }>;
};

export type SingleAssetApiResult = {
  type: MediaType;
  /** a link to the Asset resource.*/
  url?: string;
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
};

export type SearchEntryPreview = {
  id: string;
  name: string;
  fileFormat?: FileFormat;
  mimeType?: string;
  /** a link that redirects to the location of the Asset thumbnail in S3, from where it is downloaded. This is at most a 260x260 image.*/
  thumbnailUrl?: string;
  /** a link that redirects to the location of a larger Asset thumbnail in S3, from where it is downloaded. This is at most a 480x480 image.*/
  previewUrl?: string;
};

export type UserApiResult = {
  id: number;
  url: string;
  username: string;
  forename: string;
  surname: string;
  emailAddress: string;
  groupIds: string[];
  isAdmin: boolean;
  isOrgUnitAdmin: boolean;
};

type ApiUrl = string;

export type AssetTypesApiResult = Array<ApiUrl>;

export type SingleAssetTypeApiResult = {
  id: number;
  name: string;
};

export type AttributesApiResult = Array<ApiUrl>;

export type SingleAttributeApiResult = {
  id: number;
  label: string;
  typeId: number;
  url: string;
  listValuesUrl?: string;
  keywordsUrl?: string;
};

export type SingleAttributeListValuesApiResult = Array<{
  url: string;
  value: string;
}>;

export type SingleAttribute = {
  id: number;
  label: string;
  typeId: number;
  listValues: Array<{
    value: string;
    label?: string;
  }>;
};

export type FoldersApiResult = Array<ApiUrl>;

export type SingleFolderApiResult = {
  id: number;
  name: string;
  children: Array<SingleFolderApiResult>;
};

export type FlatFolder = {
  id: number;
  name: string;
  path: string;
};

export type SingleUserApiResult = {
  id: number;
  username: string;
  forename: string;
  surname: string;
  emailAddress: string;
};

export type PlainTextApiResult = {
  plainText: string;
};
