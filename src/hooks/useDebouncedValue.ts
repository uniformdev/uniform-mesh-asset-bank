import { useState } from 'react';
import { useDebounce } from 'react-use';

export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(() => value);

  useDebounce(
    () => {
      setDebouncedValue(value);
    },
    delayMs,
    [value]
  );

  return debouncedValue;
};
