import { useMemo, useRef } from 'react';
import { useAsync } from 'react-use';
import { dequal } from 'dequal';
import { Filter } from '@uniformdev/mesh-sdk-react';

import {
  AssetBankClient,
  FILE_FORMAT_IMAGE,
  SearchApiResult,
  WELL_KNOWN_ATTRIBUTES,
  WELL_KNOWN_FILTERS,
} from '@lib';
import { useIntegrationSettings } from './useIntegrationSettings';

export const useAssetSearch = ({
  client,
  keyword,
  limit,
  offset,
  filters,
  activeFolderId,
  explorerMode = false,
}: {
  client: AssetBankClient | null | undefined;
  keyword?: string;
  limit?: number;
  offset?: number;
  filters: Filter[];
  activeFolderId?: string | null;
  explorerMode?: boolean;
}): ReturnType<typeof useAsync<() => Promise<SearchApiResult | null>>> => {
  const settings = useIntegrationSettings(true);

  const fileFormatFieldId = useMemo(
    () => settings.attributes?.find((x) => x.label === WELL_KNOWN_ATTRIBUTES.fileFormat.label)?.id,
    [settings.attributes]
  );

  const memoizedFilters = useDeepCompareMemoize(filters.filter((x) => x.field && x.operator && x.value));

  return useAsync(async () => {
    if (!client || !fileFormatFieldId) {
      return null;
    }

    // When navigating by folder cards, activeFolderId takes precedence over any folder filter
    // coming from the SearchAndFilter UI — drop the latter to avoid conflicts.
    const baseFilters =
      activeFolderId != null
        ? memoizedFilters.filter((f) => f.field !== WELL_KNOWN_FILTERS.folder)
        : memoizedFilters;

    const finalFilters: Filter[] = [
      {
        field: `${WELL_KNOWN_FILTERS.attributePrefix}${fileFormatFieldId}`,
        operator: 'eq',
        value: FILE_FORMAT_IMAGE,
      },
      ...(activeFolderId != null
        ? [{ field: WELL_KNOWN_FILTERS.folder, operator: 'eq', value: activeFolderId }]
        : []),
      ...baseFilters,
    ];

    return await client.search({
      keyword,
      limit,
      offset,
      filters: finalFilters,
      // In explorer mode show only direct children of the current folder — subfolders
      // are rendered as navigable cards, so including their assets would be confusing.
      includeSubfolders: !explorerMode,
    });
  }, [client, keyword, limit, offset, memoizedFilters, fileFormatFieldId, activeFolderId, explorerMode]);
};

const useDeepCompareMemoize = <T>(value: T) => {
  const ref = useRef<T>(value);

  if (!dequal(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};
