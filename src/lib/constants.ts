import { Operator } from '@uniformdev/mesh-sdk-react';

import { FileFormat } from './client';

export const TRUE_VALIDATION_RESULT = Object.freeze({ isValid: true });

export const ASSET_FILE_FORMATS: FileFormat[] = [
  'Image',
  'Video',
  'Audio',
  'Design File',
  'Document',
  'Other',
];

export const FILE_FORMAT_IMAGE: FileFormat = 'Image';

// For now we only support `Image` file format
export const ALLOWED_FILE_FORMATS: FileFormat[] = [FILE_FORMAT_IMAGE];

export const DEFAULT_SEARCH_LIMIT = 40;

export const DEFAULT_RATE_LIMIT = 2;

export const ASSET_ORIENTATIONS: Record<string, string> = {
  '1': 'Landscape',
  '2': 'Portrait',
  '3': 'Square',
};

export const ATTRIBUTE_TYPES: Record<string, number> = {
  // System attributes are uneditable
  System: 0,
  Text: 1,
  TextArea: 2,
  Datepicker: 3,
  Dropdown: 4,
  Checklist: 5,
  Optionlist: 6,
  KeywordPicker: 7,
  Datetime: 8,
  Hyperlink: 9,
  GroupHeader: 10,
  Autoincrement: 11,
  ExternalDictionary: 12,
  DataLookupButton: 13,
  TextFieldShort: 14,
  TextAreaShort: 15,
  Numeric: 16,
  SpatialArea: 17,
  File: 18,
};

export const FILTERABLE_ATTRIBUTE_TYPES: Array<number> = [
  ATTRIBUTE_TYPES.Text,
  ATTRIBUTE_TYPES.TextArea,
  ATTRIBUTE_TYPES.Dropdown,
  ATTRIBUTE_TYPES.Checklist,
  ATTRIBUTE_TYPES.Optionlist,
  // ATTRIBUTE_TYPES.KeywordPicker,
  ATTRIBUTE_TYPES.TextFieldShort,
  ATTRIBUTE_TYPES.TextAreaShort,
  // ATTRIBUTE_TYPES.Numeric,
];

export const SELECTABLE_ATTRIBUTE_TYPES: Array<number> = [
  ATTRIBUTE_TYPES.Dropdown,
  ATTRIBUTE_TYPES.Checklist,
  ATTRIBUTE_TYPES.Optionlist,
];

export const OPERATORS_PER_ATTRIBUTE_TYPE: Record<number, Operator[]> = {
  [ATTRIBUTE_TYPES.Text]: [
    {
      label: 'contains...',
      value: 'match',
      editorType: 'text',
      expectedValueType: 'single',
    },
  ],
  [ATTRIBUTE_TYPES.TextArea]: [
    {
      label: 'contains...',
      value: 'match',
      editorType: 'text',
      expectedValueType: 'single',
    },
  ],
  [ATTRIBUTE_TYPES.Dropdown]: [
    {
      label: 'is',
      value: 'eq',
      editorType: 'singleChoice',
      expectedValueType: 'single',
    },
  ],
  [ATTRIBUTE_TYPES.Checklist]: [
    {
      label: 'is',
      value: 'eq',
      editorType: 'singleChoice',
      expectedValueType: 'single',
    },
  ],
  [ATTRIBUTE_TYPES.Optionlist]: [
    {
      label: 'is',
      value: 'eq',
      editorType: 'singleChoice',
      expectedValueType: 'single',
    },
  ],
  [ATTRIBUTE_TYPES.TextFieldShort]: [
    {
      label: 'contains...',
      value: 'match',
      editorType: 'text',
      expectedValueType: 'single',
    },
  ],
  [ATTRIBUTE_TYPES.TextAreaShort]: [
    {
      label: 'contains...',
      value: 'match',
      editorType: 'text',
      expectedValueType: 'single',
    },
  ],
  // [ATTRIBUTE_TYPES.Numeric]: [
  //   {
  //     label: 'contains...',
  //     value: 'match',
  //     editorType: 'text',
  //     expectedValueType: 'single',
  //   },
  // ],
};

export const WELL_KNOWN_FILTERS = {
  folder: 'folder',
  assetType: 'assetType',
  attributePrefix: 'attribute_',
};

export const WELL_KNOWN_ATTRIBUTES = {
  assetId: {
    name: 'assetId',
    label: 'ID',
  },
  title: {
    name: 'Title',
    label: 'Title',
  },
  altText: {
    name: 'Alt text',
    label: 'Alt text',
  },
  originalFilename: {
    name: 'originalFilename',
    label: 'Original Filename',
  },
  fileFormat: {
    name: 'File Format',
    label: 'File Format',
  },
  description: {
    name: 'Description',
    label: 'Description',
  },
  size: {
    name: 'size',
    label: 'Size',
  },
  orientation: {
    name: 'orientation',
    label: 'Orientation',
  },
  addedBy: {
    name: 'addedBy',
    label: 'Added By',
  },
  lastModifiedBy: {
    name: 'lastModifiedBy',
    label: 'Last Modified By',
  },
  availableToAssetTransformer: {
    name: 'Available to Asset Transformer?',
    label: 'Available to Asset Transformer?',
  },
} as const;
