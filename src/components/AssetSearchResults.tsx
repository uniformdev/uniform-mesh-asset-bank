import { Button, Callout, HorizontalRhythm, Paragraph } from '@uniformdev/design-system';
import { useSearchAndFilter } from '@uniformdev/mesh-sdk-react';

type AssetSearchResultsProps = {
  /** True when at the bare explorer root and no search is being made. */
  suppressSearch: boolean;
  /** Hides the "Empty folder" callout (e.g. at the absolute root where emptiness is expected). */
  suppressEmptyFolder?: boolean;
  /** Name of the current folder, or null when at the unrestricted root. */
  currentFolderName: string | null;
  /** Number of results, or undefined while loading. */
  totalResults: number | undefined;
  onResetFilters: () => void;
};

export const AssetSearchResults = ({
  suppressSearch,
  suppressEmptyFolder = false,
  currentFolderName,
  totalResults,
  onResetFilters,
}: AssetSearchResultsProps) => {
  const { searchTerm, filters, setSearchTerm } = useSearchAndFilter();

  // At the bare explorer root with no keyword or folder filter selected
  if (suppressSearch) {
    return (
      <Callout title="Select a folder" type="note">
        <Paragraph>Choose a folder below to browse its assets.</Paragraph>
      </Callout>
    );
  }

  // Still loading or results are present — nothing to display
  if (totalResults === undefined || totalResults > 0) {
    return null;
  }

  // Zero results — figure out why and give a helpful message
  const hasActiveFilters = filters.some((f) => f.field && f.value);
  const folderLabel = currentFolderName ? `"${currentFolderName}"` : 'this folder';

  const clearSearch = () => setSearchTerm('');
  const clearAll = () => {
    setSearchTerm('');
    onResetFilters();
  };

  if (searchTerm && hasActiveFilters) {
    return (
      <Callout title="No matching results" type="note">
        <Paragraph>
          No assets in {folderLabel} match your search for &ldquo;{searchTerm}&rdquo; with the active filters.
        </Paragraph>
        <HorizontalRhythm gap="sm">
          <Button buttonType="tertiaryOutline" size="xs" onClick={clearSearch}>
            Clear search
          </Button>
          <Button buttonType="tertiaryOutline" size="xs" onClick={clearAll}>
            Clear all
          </Button>
        </HorizontalRhythm>
      </Callout>
    );
  }

  if (searchTerm) {
    return (
      <Callout title={`No results for "${searchTerm}"`} type="note">
        <Paragraph>No assets in {folderLabel} match your search.</Paragraph>
        <Button buttonType="tertiaryOutline" size="xs" onClick={clearSearch}>
          Clear search
        </Button>
      </Callout>
    );
  }

  if (hasActiveFilters) {
    return (
      <Callout title="No results match the selected filters" type="note">
        <Paragraph>No assets in {folderLabel} match your filters.</Paragraph>
        <Button buttonType="tertiaryOutline" size="xs" onClick={onResetFilters}>
          Clear filters
        </Button>
      </Callout>
    );
  }

  // Empty folder, no search or filters active — skip at root where emptiness is expected
  if (suppressEmptyFolder) {
    return null;
  }

  return (
    <Callout title="Empty folder" type="note">
      <Paragraph>
        {currentFolderName
          ? `The folder "${currentFolderName}" contains no assets.`
          : 'This folder contains no assets.'}
      </Paragraph>
    </Callout>
  );
};
