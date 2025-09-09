import { useCallback, useMemo, useState } from 'react';

import { SelectOption } from '@lib';
import { InputComboBoxWithAutoResize, InputComboBoxWithAutoResizeProps } from './InputComboBoxWithAutoResize';

export const InputOptionSelector = <
  IsMulti extends boolean = false,
  TValue extends string | SelectOption = string,
>({
  name,
  isMulti,
  options,
  value,
  allowCustomValue = false,
  label,
  caption,
  enableAutoResize = true,
  onChange,
  ...comboboxProps
}: Omit<
  InputComboBoxWithAutoResizeProps<SelectOption, IsMulti>,
  'isMulti' | 'options' | 'value' | 'onChange' | 'onInputChange'
> & {
  isMulti: IsMulti;
  options: SelectOption[];
  value: IsMulti extends true ? TValue[] : TValue | null | undefined;
  allowCustomValue?: boolean;
  onChange: (value: IsMulti extends true ? SelectOption[] : SelectOption | undefined) => void;
}) => {
  const [inputText, setInputText] = useState<string>();

  const inputValue = useMemo<SelectOption[] | SelectOption | null>(() => {
    if (Array.isArray(value)) {
      // loop through `values` instead of `options` to keep selected order
      return value.map(findByValue).filter((x) => !!x);
    } else {
      return findByValue(value as TValue | null | undefined);
    }

    function findByValue(value: TValue | null | undefined): SelectOption | null {
      if (!value) {
        return null;
      }

      const optionValue: string | undefined = typeof value === 'object' ? value?.value : value;
      if (!optionValue) {
        return null;
      }

      const option = options.find((opt) => opt.value === optionValue);
      if (option) {
        return option;
      }

      // keep previously selected options, even if unavailable right now
      // let users to decide what to do with them
      return typeof value === 'string'
        ? {
            label: value,
            value,
          }
        : value;
    }
  }, [options, value]);

  const inputOptions = useMemo(() => {
    // do not show empty option when user is typing custom field
    const firstOption: SelectOption =
      allowCustomValue && inputText
        ? {
            label: `Add '${inputText}'`,
            value: inputText,
          }
        : { label: allowCustomValue ? 'Select or type custom value...' : 'Select...', value: '' };

    return [firstOption, ...options];
  }, [options, allowCustomValue, inputText]);

  const handleElementChange = useCallback(
    (newValue: readonly SelectOption[] | SelectOption | null) => {
      type OutputValue = Parameters<typeof onChange>[0];

      if (Array.isArray(newValue)) {
        const values: SelectOption[] = newValue.filter((x) => x.value);

        setInputText(undefined);
        onChange(values as OutputValue);
      } else {
        const value: SelectOption | undefined = newValue ? (newValue as SelectOption) : undefined;

        setInputText(undefined);
        onChange(value as OutputValue);
      }
    },
    [onChange]
  );

  const handleOnInputChange = useCallback((newValue: string) => {
    setInputText(newValue.trim());
  }, []);

  return (
    <InputComboBoxWithAutoResize
      {...comboboxProps}
      name={name}
      label={label}
      caption={caption}
      options={inputOptions}
      isMulti={isMulti}
      value={inputValue}
      onChange={handleElementChange}
      onInputChange={allowCustomValue ? handleOnInputChange : undefined}
      enableAutoResize={enableAutoResize}
    />
  );
};
