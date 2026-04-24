import { ASSET_ORIENTATIONS, DEFAULT_RATE_LIMIT, WELL_KNOWN_ATTRIBUTES, WELL_KNOWN_FILTERS } from '@lib';
import { ApiFetcher, createCorsFetcher } from './fetcher';
import {
  SingleAssetTypeApiResult,
  AssetTypesApiResult,
  SearchApiResult,
  UserApiResult,
  SingleAssetApiResult,
  SingleAttributeApiResult,
  AttributesApiResult,
  SingleAttributeListValuesApiResult,
  SingleAttribute,
  AccessLevelFolder,
  SingleUserApiResult,
} from './types';
import { Filter } from '@uniformdev/mesh-sdk-react';

export type AssetBankClientOptions = {
  apiHost: string;
  accessToken: string;
  rateLimit?: number;
};

export class AssetBankClient {
  fetcher: ApiFetcher;

  constructor({ apiHost, accessToken, rateLimit = DEFAULT_RATE_LIMIT }: AssetBankClientOptions) {
    this.fetcher = createCorsFetcher({ apiHost, token: accessToken, rateLimit });
  }

  public async getByUrl<TResult extends object>(apiUrl: string): Promise<TResult | null> {
    return await this.fetcher<TResult>(apiUrl);
  }

  public async getCurrentUser() {
    return await this.fetcher<UserApiResult>('/rest/authenticated-user');
  }

  public async isValidAccessToken() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }

  public async search({
    keyword,
    limit,
    offset,
    filters,
    includeSubfolders = true,
  }: {
    keyword?: string;
    limit?: number;
    offset?: number;
    filters: Filter[];
    includeSubfolders?: boolean;
  }): Promise<SearchApiResult | null> {
    // Determine the base URL based on the context
    const apiUrl: URL = new URL('/rest/asset-search', 'https://none.com');

    const folder = filters.find((f) => f.field === WELL_KNOWN_FILTERS.folder)?.value;
    if (folder && typeof folder === 'string') {
      apiUrl.searchParams.set('permissionCategoryForm.categoryIds', folder);
      apiUrl.searchParams.set('includeImplicitCategoryMembers', String(includeSubfolders));
    }

    const assetType = filters.find((f) => f.field === WELL_KNOWN_FILTERS.assetType)?.value;
    if (assetType && typeof assetType === 'string') {
      apiUrl.searchParams.set('assetTypeId', assetType);
    }

    const attributes = filters.filter((f) => f.field.startsWith(WELL_KNOWN_FILTERS.attributePrefix));
    attributes.forEach((attribute) => {
      if (attribute.value) {
        apiUrl.searchParams.set(attribute.field, attribute.value as string);
      }
    });

    if (keyword) {
      apiUrl.searchParams.set('keywords', keyword);
    }

    const finalLimit = limit && limit > 0 ? limit : 100;
    const finalOffset = offset && offset > 0 ? offset : 0;

    apiUrl.searchParams.set('page', String(Math.ceil(finalOffset / finalLimit)));
    apiUrl.searchParams.set('pageSize', String(finalLimit));

    const json = await this.fetcher<SearchApiResult>(apiUrl.pathname + apiUrl.search);
    return Array.isArray(json) ? json : null;
  }

  public async getAssetDetails({ id }: { id: string }): Promise<SingleAssetApiResult | null> {
    if (!id) {
      return null;
    }

    const asset = await this.fetcher<SingleAssetApiResult>(`/rest/assets/${id}`);

    return asset?.type ? asset : null;
  }

  /**
   * Fetch a single access-level folder with its direct children (single depth only).
   * The API proxy strips grandchildren to prevent large payloads.
   */
  public async getAccessLevelFolder(id: string): Promise<AccessLevelFolder | null> {
    const folder = await this.fetcher<AccessLevelFolder>(`/rest/access-levels/${id}`);
    return folder?.id != null ? folder : null;
  }

  public async getAssetTypes(): Promise<SingleAssetTypeApiResult[] | null> {
    const assetTypeUrls = await this.fetcher<AssetTypesApiResult>(`/rest/asset-types`);
    if (!Array.isArray(assetTypeUrls)) {
      return null;
    }

    const assetTypes = await Promise.all(
      assetTypeUrls.map((url) => this.fetcher<SingleAssetTypeApiResult>(url))
    );

    return Array.isArray(assetTypes) ? assetTypes.filter((x) => !!x) : null;
  }

  /**
   * WARNING: Expensive operation!
   * We need to do many fetches because of Asset Bank API design.
   */
  public async getAttributes(options?: {
    onProgress?: (step: number, total: number) => void;
  }): Promise<SingleAttribute[] | null> {
    const attributeUrls = await this.fetcher<AttributesApiResult>(`/rest/attributes`);
    if (!Array.isArray(attributeUrls)) {
      return null;
    }

    const total = attributeUrls.length;
    let step = 0;

    const attributes = await Promise.all(
      attributeUrls.map(async (url) => {
        const json = await this.fetcher<SingleAttributeApiResult>(url);
        if (!json) {
          return null;
        }

        const attribute: SingleAttribute = {
          id: json.id,
          label: json.label,
          typeId: json.typeId,
          listValues: [],
        };

        if (json?.listValuesUrl) {
          const listValues = await this.fetcher<SingleAttributeListValuesApiResult>(json.listValuesUrl);

          attribute.listValues =
            listValues?.map((v) => ({
              value: v.value,
            })) ?? [];
        }

        options?.onProgress?.(++step, total);
        return attribute;
      })
    );

    if (!Array.isArray(attributes)) {
      return null;
    }

    const validAttributes = attributes
      .filter((x) => !!x)
      .sort((a, b) => a.id - b.id)
      .map(prepareAttribute);

    return validAttributes;
  }

  public async getUser({ id }: { id: number }): Promise<SingleUserApiResult | null> {
    const user = await this.fetcher<SingleUserApiResult>(`/rest/users/${id}`);
    return user?.id ? user : null;
  }
}

const prepareAttribute = (attribute: SingleAttribute): SingleAttribute => {
  if (attribute.label === WELL_KNOWN_ATTRIBUTES.orientation.label) {
    attribute.listValues =
      attribute.listValues?.map((v) => ({
        value: v.value,
        label: ASSET_ORIENTATIONS[v.value] ?? undefined,
      })) ?? [];
  }

  return attribute;
};
