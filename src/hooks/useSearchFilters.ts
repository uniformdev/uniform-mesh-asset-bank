import { useCallback, useMemo, useState } from 'react';

import { useIntegrationSettings } from '@hooks';
import { Filter, FilterOption, FilterOptionGroup } from '@uniformdev/mesh-sdk-react';
import {
  FileFormat,
  FILTERABLE_ATTRIBUTE_TYPES,
  IntegrationSettings,
  OPERATORS_PER_ATTRIBUTE_TYPE,
  SELECTABLE_ATTRIBUTE_TYPES,
  WELL_KNOWN_ATTRIBUTES,
  WELL_KNOWN_FILTERS,
} from '@lib';

const FILTER_GROUPS = {
  SYSTEM: {
    label: 'System',
    value: 'system',
  },
  ATTRIBUTES: {
    label: 'Attributes',
    value: 'attributes',
  },
} as const;

type FilterEx = Filter & { required?: boolean };

export const useSearchFilters = ({
  allowedFileFormats: _,
}: {
  allowedFileFormats: FileFormat[];
}): {
  filterOptions: FilterOptionGroup[];
  initialFilters: Filter[];
  filters: Filter[];
  handleFiltersChange: (newFilters: Filter[]) => void;
} => {
  const settings = useIntegrationSettings(true);

  const initialFilters = useMemo(() => {
    const filters: FilterEx[] = [];

    // ensure we have folder options
    if (settings.folders?.length) {
      filters.push({
        field: WELL_KNOWN_FILTERS.folder,
        operator: 'eq',
        value: settings.rootFolder ? String(settings.rootFolder.id) : '',
        required: !!settings.rootFolder,
      });
    }

    // add empty filter if no filters are present for better looking UI
    if (filters.length === 0) {
      filters.push({
        field: '',
        operator: '',
        value: '',
      });
    }

    return filters;
  }, [settings.folders?.length, settings.rootFolder]);

  const [filters, setFilters] = useState<FilterEx[]>(initialFilters);
  const activeFilterKeys = useMemo(() => filters.map((x) => x.field), [filters]);

  const filterOptions = useMemo(() => {
    const filterGroups: FilterOptionGroup[] = [
      {
        ...FILTER_GROUPS.SYSTEM,
        options: [getFoldersFilterOptions(settings, activeFilterKeys)].filter((x) => !!x),
      },
    ];

    if (settings.attributes?.length) {
      filterGroups.push({
        ...FILTER_GROUPS.ATTRIBUTES,
        options: settings.attributes
          ?.filter(
            (x) =>
              FILTERABLE_ATTRIBUTE_TYPES.includes(x.typeId) &&
              x.label !== WELL_KNOWN_ATTRIBUTES.fileFormat.label
          )
          .map<FilterOption | null>((attribute) => {
            const operatorOptions = OPERATORS_PER_ATTRIBUTE_TYPE[attribute.typeId] ?? [];
            if (!operatorOptions.length) {
              return null;
            }

            const label = attribute.label;
            const valueOptions = attribute.listValues.map((v) => ({
              label: v.label ?? v.value,
              value: v.value,
            }));

            // remove dropdowns without options
            if (SELECTABLE_ATTRIBUTE_TYPES.includes(attribute.typeId) && !valueOptions.length) {
              return null;
            }

            const filterKey = `${WELL_KNOWN_FILTERS.attributePrefix}${attribute.id}`;

            return {
              label,
              value: filterKey,
              valueOptions,
              operatorOptions,
              disabled: activeFilterKeys.includes(filterKey),
            };
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
      });
    }

    return filterGroups;
  }, [settings, activeFilterKeys]);

  const handleFiltersChange = useCallback(
    (filters: Filter[]) => {
      const newFilters = prepareFilters(initialFilters, filters);

      setFilters(newFilters);
    },
    [initialFilters]
  );

  return {
    filterOptions,
    initialFilters,
    filters,
    handleFiltersChange,
  };
};

const prepareFilters = (initialFilters: FilterEx[], newFilters: FilterEx[]): FilterEx[] => {
  const filters = initialFilters.filter((f) => f.field && f.required);

  // mix with new filters, but keep required filters in place
  newFilters.forEach((filter) => {
    const existing = filters.find((f) => f.field === filter.field);
    if (!existing) {
      filters.push(filter);
      return;
    }
    // avoid overriding required value with empty value
    if (filter.value) {
      existing.operator = filter.operator;
      existing.value = filter.value;
    }
  });

  return filters;
};

const getFoldersFilterOptions = (
  settings: IntegrationSettings,
  activeFilterKeys: string[]
): FilterOption | null => {
  if (!settings.folders?.length) {
    return null;
  }

  let availableFolders = settings.folders;

  // when root folder is defined, filter should only include the root folder or subfolders
  const rootFolder = settings.rootFolder;
  if (rootFolder) {
    availableFolders = availableFolders.filter((x) => x.path.startsWith(rootFolder.path));
  }

  return {
    label: settings.rootFolder ? 'Folder (Required)' : 'Folder',
    value: WELL_KNOWN_FILTERS.folder,
    valueOptions: availableFolders.map((folder) => ({
      label: folder.path,
      value: String(folder.id),
    })),
    operatorOptions: [
      {
        label: 'is',
        value: 'eq',
        editorType: 'singleChoice',
        expectedValueType: 'single',
      },
    ],
    disabled: activeFilterKeys.includes(WELL_KNOWN_FILTERS.folder),
  };
};
