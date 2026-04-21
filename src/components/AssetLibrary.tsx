import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync } from 'react-use';
import { AnimatePresence, motion } from 'motion/react';

import { Filter, SearchAndFilter, useUniformMeshSdk } from '@uniformdev/mesh-sdk-react';

import { AssetCardGrid } from './AssetCardGrid';
import { AssetMediaCard } from './AssetMediaCard';
import { AssetFileProperties } from './AssetFileProperties';
import { FolderCard } from './FolderCard';
import { AssetSearchResults } from './AssetSearchResults';

import {
  AssetPreviewDialog,
  Asset,
  mapSearchEntryToPreview,
  DEFAULT_SEARCH_LIMIT,
  SearchEntryPreview,
  FileFormat,
} from '@lib';
import { useAssetSearch, useAuthContext, useIntegrationSettings, useSearchFilters } from '@hooks';
import {
  Button,
  Caption,
  HorizontalRhythm,
  Icon,
  Pagination,
  VerticalRhythm,
} from '@uniformdev/design-system';
import { LogoutButton } from '@components/auth/LogoutButton';
import { AssetPreviewWrapper } from '@components/AssetPreviewWrapper';

export type AssetLibraryProps = {
  mode: 'library' | 'parameter';
  allowedFileFormats: FileFormat[];
  limit?: number;
  onAssetsSelected?: (assets: Asset[]) => void;
};

type FolderEntry = { id: number; name: string };

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

  const settings = useIntegrationSettings(true);

  // When no rootFolderId is configured, fall back to '-1' which is the Asset Bank
  // absolute root — returns all top-level accessible folders and assets.
  const rootFolderId = settings.rootFolderId ?? '-1';

  // Explorer mode is always on — we always start from some folder root.
  const explorerMode = true;

  const [foldersOpen, setFoldersOpen] = useState(true);

  // Stack of folders the user has navigated into. Top of stack = current folder.
  const [folderStack, setFolderStack] = useState<FolderEntry[]>([]);

  const stackTop = folderStack.at(-1);
  const activeFolderId: string = stackTop ? String(stackTop.id) : rootFolderId;

  // At the absolute root ('-1') with no folder selected, there are no assets to search/filter.
  const isAtAbsoluteRoot = rootFolderId === '-1' && folderStack.length === 0;

  // Fetch the active folder's direct children dynamically from the API.
  const { value: currentFolder } = useAsync(async () => {
    if (!client) return null;
    return await client.getAccessLevelFolder(activeFolderId);
  }, [client, activeFolderId]);

  const subfolders = currentFolder?.children ?? [];

  const handleEnterFolder = useCallback((folder: FolderEntry) => {
    setFolderStack((prev) => [...prev, folder]);
    setOffset(0);
    setKeyword('');
  }, []);

  const handleNavigateToIndex = useCallback((index: number) => {
    setFolderStack((prev) => prev.slice(0, index));
    setOffset(0);
  }, []);

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
    activeFolderId,
    explorerMode,
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
        {!isAtAbsoluteRoot ? (
          <SearchAndFilter
            filters={filters}
            filterOptions={filterOptions}
            onChange={onFiltersChange}
            onSearchChange={handleKeywordChanged}
            onResetFilterValues={onResetFilters}
            totalResults={isSearchLoading ? undefined : assets.length}
            resultsContainerView={
              <AssetSearchResults
                suppressSearch={false}
                suppressEmptyFolder={folderStack.length === 0}
                currentFolderName={folderStack.at(-1)?.name ?? null}
                onResetFilters={onResetFilters}
              />
            }
            viewSwitchControls={
              <LogoutButton
                isAuthenticated={status === 'authenticated'}
                email={email}
                authRefresh={authRefresh}
              />
            }
          />
        ) : (
          <HorizontalRhythm justify="flex-end">
            <LogoutButton
              isAuthenticated={status === 'authenticated'}
              email={email}
              authRefresh={authRefresh}
            />
          </HorizontalRhythm>
        )}

        {folderStack.length > 0 ? (
          <FolderBreadcrumb stack={folderStack} onNavigate={handleNavigateToIndex} />
        ) : null}

        {subfolders.length > 0 ? (
          <VerticalRhythm gap="xs">
            <HorizontalRhythm align="center" justify="space-between">
              <HorizontalRhythm gap="xs" align="center">
                <Icon icon="folder" size="0.875rem" iconColor="gray300" />
                <Caption css={{ color: 'var(--gray-600)', fontWeight: 600 }}>
                  {isAtAbsoluteRoot
                    ? 'Browse folders'
                    : `Subfolders of ${folderStack.at(-1)?.name ?? currentFolder?.name}`}
                </Caption>
              </HorizontalRhythm>
              <Button type="button" buttonType="ghost" size="zero" onClick={() => setFoldersOpen((v) => !v)}>
                <Icon
                  icon={foldersOpen ? 'chevron-up' : 'chevron-down'}
                  size="0.875rem"
                  iconColor="gray300"
                />
              </Button>
            </HorizontalRhythm>

            {foldersOpen ? (
              // Use a plain CSS grid instead of AssetCardGrid/ObjectGridContainer:
              // ObjectGridContainer enforces minmax(250px, 1fr) per column which
              // overflows for compact folder layouts. This div uses pure 1fr columns.
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 'var(--spacing-base)',
                }}
              >
                {subfolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    name={folder.name}
                    childCount={folder.children.length}
                    onClick={() => handleEnterFolder(folder)}
                  />
                ))}
              </div>
            ) : null}
          </VerticalRhythm>
        ) : null}

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

type FolderBreadcrumbProps = {
  stack: FolderEntry[];
  onNavigate: (index: number) => void;
};

const breadcrumbLinkStyle = {
  color: 'var(--color-action)',
  fontSize: 'var(--text-xs)',
} as const;

const breadcrumbCurrentStyle = {
  color: 'var(--gray-900)',
  fontWeight: 600,
  fontSize: 'var(--text-xs)',
} as const;

const FolderBreadcrumb = ({ stack, onNavigate }: FolderBreadcrumbProps) => (
  <HorizontalRhythm gap="xs" align="center" style={{ flexWrap: 'wrap' }}>
    <Button type="button" buttonType="ghost" size="zero" onClick={() => onNavigate(0)}>
      <span css={breadcrumbLinkStyle}>Folders</span>
    </Button>
    {stack.map((folder, i) => {
      const isLast = i === stack.length - 1;
      return (
        <Fragment key={folder.id}>
          <Icon icon="chevron-right" size="0.75rem" iconColor="gray300" />
          {isLast ? (
            <span css={breadcrumbCurrentStyle}>{folder.name}</span>
          ) : (
            <Button type="button" buttonType="ghost" size="zero" onClick={() => onNavigate(i + 1)}>
              <span css={breadcrumbLinkStyle}>{folder.name}</span>
            </Button>
          )}
        </Fragment>
      );
    })}
  </HorizontalRhythm>
);
