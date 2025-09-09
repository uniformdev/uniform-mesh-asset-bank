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
  FoldersApiResult,
  SingleFolderApiResult,
  FlatFolder,
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
  }: {
    keyword?: string;
    limit?: number;
    offset?: number;
    filters: Filter[];
  }): Promise<SearchApiResult | null> {
    // Determine the base URL based on the context
    const apiUrl: URL = new URL('/rest/asset-search', 'https://none.com');

    const folder = filters.find((f) => f.field === WELL_KNOWN_FILTERS.folder)?.value;
    if (folder && typeof folder === 'string') {
      apiUrl.searchParams.set('permissionCategoryForm.categoryIds', folder);
      // include content from subfolders as well
      apiUrl.searchParams.set('includeImplicitCategoryMembers', 'true');
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

  public async getFlatFolders(): Promise<FlatFolder[] | null> {
    const folderUrls = await this.fetcher<FoldersApiResult>(`/rest/access-levels`);
    if (!Array.isArray(folderUrls)) {
      return null;
    }

    const flatFolders: FlatFolder[] = [];

    const walkTree = (folder: SingleFolderApiResult, path: string) => {
      const currPath = path ? `${path}/${folder.name}` : folder.name;
      flatFolders.push({ id: folder.id, name: folder.name, path: currPath });
      folder.children.forEach((child) => walkTree(child, currPath));
    };

    // do not parallelize, we don't need to fetch all folders because of `children`
    for await (const url of folderUrls) {
      const folder = await this.fetcher<SingleFolderApiResult>(url);

      if (folder && !flatFolders.some((x) => x.id === folder.id)) {
        walkTree(folder, '');
      }
    }

    return flatFolders.sort((a, b) => a.path.localeCompare(b.path));
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
  public async getAttributes(): Promise<SingleAttribute[] | null> {
    const attributeUrls = await this.fetcher<AttributesApiResult>(`/rest/attributes`);
    if (!Array.isArray(attributeUrls)) {
      return null;
    }

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
