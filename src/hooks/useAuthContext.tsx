import { ReactNode, createContext, useContext, useMemo } from 'react';

import { AssetBankClient } from '@lib';
import { useReadAuthState } from './useReadAuthState';
import { useAssetBankClient } from './useAssetBankClient';
import { useIntegrationSettings } from '@hooks';

export type AuthContextValue = {
  status: 'loading' | 'error' | 'authenticated' | 'unauthenticated';
  client: AssetBankClient | null;
  email?: string;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthContextProvider');
  }

  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const settings = useIntegrationSettings(false);
  const isSettingsLoaded = !!settings;

  const auth = useReadAuthState(settings ?? {});

  const client = useAssetBankClient({
    apiHost: auth.value?.apiHost,
    accessToken: auth.value?.accessToken,
    rateLimit: settings?.rateLimit,
  });

  const value = useMemo<AuthContextValue>(() => {
    if (!isSettingsLoaded || auth.loading) {
      return { status: 'loading', client: null, refresh: auth.retry };
    }

    if (!auth.value) {
      return { status: 'error', client: null, refresh: auth.retry };
    }

    return {
      status: auth.value.status,
      client,
      email: auth.value.email,
      refresh: auth.retry,
    };
  }, [auth, client, isSettingsLoaded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
