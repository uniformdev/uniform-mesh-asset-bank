import { useMemo } from 'react';

import { AssetBankClient } from '@lib';

export const useAssetBankClient = ({
  apiHost,
  accessToken,
  rateLimit,
}: {
  apiHost?: string;
  accessToken?: string;
  rateLimit?: number;
}): AssetBankClient | null => {
  return useMemo(() => {
    if (!apiHost || !accessToken) {
      return null;
    }

    return new AssetBankClient({ apiHost, accessToken, rateLimit });
  }, [apiHost, accessToken, rateLimit]);
};
