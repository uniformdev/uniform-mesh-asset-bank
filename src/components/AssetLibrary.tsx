import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { Filter, SearchAndFilter, useUniformMeshSdk } from '@uniformdev/mesh-sdk-react';

import { AssetCardGrid } from './AssetCardGrid';
import { AssetMediaCard } from './AssetMediaCard';
import { AssetFileProperties } from './AssetFileProperties';

import {
  AssetPreviewDialog,
  Asset,
  mapSearchEntryToPreview,
  DEFAULT_SEARCH_LIMIT,
  SearchEntryPreview,
  FileFormat,
} from '@lib';
import { useAssetSearch, useAuthContext, useSearchFilters } from '@hooks';
import { HorizontalRhythm, Pagination, VerticalRhythm } from '@uniformdev/design-system';
import { LogoutButton } from '@components/auth/LogoutButton';
import { AssetPreviewWrapper } from '@components/AssetPreviewWrapper';

export type AssetLibraryProps = {
  mode: 'library' | 'parameter';
  allowedFileFormats: FileFormat[];
  limit?: number;
  onAssetsSelected?: (assets: Asset[]) => void;
};

export const AssetLibrary = ({
  mode,
  allowedFileFormats,
  limit = DEFAULT_SEARCH_LIMIT,
  onAssetsSelected,
}: AssetLibraryProps) => {
  const sdk = useUniformMeshSdk();
  const { client, status, email, refresh: authRefresh } = useAuthContext();

  const [keyword, setKeyword] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const handlePageChange = useCallback((_limit: number, offset: number) => {
    setOffset(offset);
    setHasNextPage(false);
    searchRef.current?.scrollIntoView();
  }, []);

  const handleKeywordChanged = useCallback((keyword: string) => {
    setKeyword(keyword);
    setOffset(0);
  }, []);

  const handleOpenPreview = useCallback(
    async (asset: SearchEntryPreview) => {
      const dialog = await sdk.openLocationDialog<AssetPreviewDialog['result'], AssetPreviewDialog['params']>(
        {
          locationKey: 'asset-preview',
          options: {
            params: {
              mode,
              id: asset.id,
            },
            width: 'wide',
            contentHeight: '80vh',
          },
        }
      );
      const result = dialog?.value;
      if (result?.asset?.id) {
        onAssetsSelected?.([result.asset]);
      }
    },
    [sdk, mode, onAssetsSelected]
  );

  const { filterOptions, initialFilters, filters, handleFiltersChange } = useSearchFilters({
    allowedFileFormats,
  });

  const onFiltersChange = useCallback(
    (filters: Filter[]) => {
      handleFiltersChange(filters);

      // reset pagination
      setOffset(0);
    },
    [handleFiltersChange]
  );

  const onResetFilters = useCallback(
    () => onFiltersChange(initialFilters),
    [onFiltersChange, initialFilters]
  );

  const { value: searchResult, loading: isSearchLoading } = useAssetSearch({
    client,
    keyword,
    limit,
    offset,
    filters,
  });

  const assets: SearchEntryPreview[] = useMemo(() => {
    if (!searchResult?.length) {
      return [];
    }

    return searchResult?.map((entry) => mapSearchEntryToPreview({ entry }));
  }, [searchResult]);

  // Assets Search API does not have `total count` mechanism.
  // Let's use `offset+1` approach
  const totalCount = offset + limit + (hasNextPage && assets.length >= limit ? 1 : 0);
  useEffect(() => {
    if (!isSearchLoading) {
      setHasNextPage(assets.length >= limit);
    }
  }, [assets, limit, isSearchLoading]);

  const [assetId, setAssetId] = useState<string>();

  return (
    <VerticalRhythm>
      <AnimatePresence mode="wait">
        {assetId ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ ease: 'easeInOut', duration: 0.2 }}
          >
            <AssetPreviewWrapper
              mode={mode}
              assetId={assetId}
              onAssetSelect={(asset) => onAssetsSelected?.([asset])}
              onClose={() => setAssetId(undefined)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <VerticalRhythm
        gap="sm"
        style={{ marginTop: 'var(--spacing-sm)', display: assetId ? 'none' : undefined }}
      >
        <SearchAndFilter
          filters={filters}
          filterOptions={filterOptions}
          onChange={onFiltersChange}
          onSearchChange={handleKeywordChanged}
          onResetFilterValues={onResetFilters}
          totalResults={assets.length}
          // do not show 'no results' container while user is waiting for response
          resultsContainerView={isSearchLoading ? null : undefined}
          viewSwitchControls={
            <HorizontalRhythm gap="sm" justify="flex-end" align="center">
              <LogoutButton
                isAuthenticated={status === 'authenticated'}
                email={email}
                authRefresh={authRefresh}
              />
            </HorizontalRhythm>
          }
        />

        <AssetCardGrid
          itemsPerRow={4}
          isLoading={isSearchLoading}
          isEmpty={!isSearchLoading && !assets.length}
        >
          {assets.map((asset) => (
            <AssetMediaCard
              key={asset.id}
              title={asset.name}
              url={asset.previewUrl || asset.thumbnailUrl}
              onClick={mode === 'parameter' ? () => setAssetId(asset.id) : () => handleOpenPreview(asset)}
            >
              <AssetFileProperties asset={asset} />
            </AssetMediaCard>
          ))}
        </AssetCardGrid>
        <HorizontalRhythm justify="center">
          <Pagination limit={limit} offset={offset} total={totalCount} onPageChange={handlePageChange} />
        </HorizontalRhythm>
      </VerticalRhythm>
    </VerticalRhythm>
  );
};
