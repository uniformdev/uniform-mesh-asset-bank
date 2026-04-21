import { useCallback, useMemo, useState } from 'react';

import { useIntegrationSettings } from '@hooks';
import { Filter, FilterOption, FilterOptionGroup } from '@uniformdev/mesh-sdk-react';
import {
  FileFormat,
  FILTERABLE_ATTRIBUTE_TYPES,
  OPERATORS_PER_ATTRIBUTE_TYPE,
  SELECTABLE_ATTRIBUTE_TYPES,
  WELL_KNOWN_ATTRIBUTES,
  WELL_KNOWN_FILTERS,
} from '@lib';

const FILTER_GROUPS = {
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

  const initialFilters = useMemo<FilterEx[]>(() => [{ field: '', operator: '', value: '' }], []);

  const [filters, setFilters] = useState<FilterEx[]>(initialFilters);
  const activeFilterKeys = useMemo(() => filters.map((x) => x.field), [filters]);

  const filterOptions = useMemo(() => {
    const filterGroups: FilterOptionGroup[] = [];

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

  newFilters.forEach((filter) => {
    const existing = filters.find((f) => f.field === filter.field);
    if (!existing) {
      filters.push(filter);
      return;
    }
    if (filter.value) {
      existing.operator = filter.operator;
      existing.value = filter.value;
    }
  });

  return filters;
};
