import { ReactNode } from 'react';
import { css } from '@emotion/react';

import {
  Caption,
  ComboBoxGroupBase,
  InputComboBox,
  InputComboBoxOption,
  InputComboBoxProps,
  Label,
} from '@uniformdev/design-system';

const MAX_MENU_HEIGHT = 208;

/*
  React Select works not so great with iframes,
  because Mesh SDK could not calculate size properly when menu is opened

  `InputComboBoxWithAutoResize` set max-height for `InputComboBox` menu to 208 (5 options can be rendered)

  We can resize parent div(.input-combobox-autoresize) based on number of options rendered.

  Numbers:
  - input-combobox__control (min-height: 48px)
  - input-combobox__menu (40px + 8px per option, max-height: 208px)

  min-height: ~= 48px + 40px * (optionsCount + 1)
*/
const autoresizeStyles = css`
  &:has(.input-combobox__menu .input-combobox__option) {
    min-height: 140px;
  }

  &:has(.input-combobox__menu .input-combobox__option:nth-child(2)) {
    min-height: 180px;
  }

  &:has(.input-combobox__menu .input-combobox__option:nth-child(3)) {
    min-height: 220px;
  }

  &:has(.input-combobox__menu .input-combobox__option:nth-child(4)) {
    min-height: 260px;
  }

  &:has(.input-combobox__menu .input-combobox__option:nth-child(5)) {
    min-height: 300px;
  }
`;

export type InputComboBoxWithAutoResizeProps<
  TOption = InputComboBoxOption,
  IsMulti extends boolean = false,
  TGroup extends ComboBoxGroupBase<TOption> = ComboBoxGroupBase<TOption>,
> = InputComboBoxProps<TOption, IsMulti, TGroup> & {
  enableAutoResize?: boolean;
  label?: string | ReactNode;
  caption?: string | ReactNode;
};

export function InputComboBoxWithAutoResize<
  TOption = InputComboBoxOption,
  IsMulti extends boolean = false,
  TGroup extends ComboBoxGroupBase<TOption> = ComboBoxGroupBase<TOption>,
>({
  enableAutoResize = true,
  label,
  caption,
  ...restProps
}: InputComboBoxWithAutoResizeProps<TOption, IsMulti, TGroup>) {
  return (
    <div css={enableAutoResize ? autoresizeStyles : undefined}>
      {label && <Label>{label}</Label>}
      <InputComboBox {...restProps} maxMenuHeight={MAX_MENU_HEIGHT} />
      {caption && <Caption>{caption}</Caption>}
    </div>
  );
}
