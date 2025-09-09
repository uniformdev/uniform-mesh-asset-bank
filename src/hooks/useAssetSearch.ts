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
}: {
  client: AssetBankClient | null | undefined;
  keyword?: string;
  limit?: number;
  offset?: number;
  filters: Filter[];
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

    // force to fetch only `Image` assets
    const finalFilters = [
      {
        field: `${WELL_KNOWN_FILTERS.attributePrefix}${fileFormatFieldId}`,
        operator: 'eq',
        value: FILE_FORMAT_IMAGE,
      },
      ...memoizedFilters,
    ];

    return await client.search({
      keyword,
      limit,
      offset,
      filters: finalFilters,
    });
  }, [client, keyword, limit, offset, memoizedFilters, fileFormatFieldId]);
};

const useDeepCompareMemoize = <T>(value: T) => {
  const ref = useRef<T>(value);

  if (!dequal(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};
