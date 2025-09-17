import { ReactNode, useMemo, useState } from 'react';
import { Callout, LoadingOverlay } from '@uniformdev/mesh-sdk-react';
import { DashedBox, Heading, HorizontalRhythm, VerticalRhythm } from '@uniformdev/design-system';

import { useAuthContext, useIntegrationSettings } from '@hooks';
import { validateSettings } from '@lib';
import { LoginButton } from './LoginButton';
import { Delayed } from '../Delayed';

import ErrorSettingsCallout from '../ErrorSettingsCallout';
import { useEffectOnce } from 'react-use';

export const AuthorizationOverlay = ({ children }: { children: ReactNode }) => {
  const settings = useIntegrationSettings(false);

  const { status, refresh } = useAuthContext();

  const isValidSettings = useMemo(() => validateSettings(settings), [settings]);

  const [hasStorageAccess, setHasStorageAccess] = useState<boolean | undefined>(undefined);

  // Self-hosted integration requires third-party cookies to be allowed to store `next-auth` cookies
  useEffectOnce(() => {
    const hostname = window.location.hostname;
    if (hostname === 'uniform.app' || hostname.endsWith('.uniform.app')) {
      setHasStorageAccess(true);
    } else {
      document.hasStorageAccess().then((value) => setHasStorageAccess(value));
    }
  });

  if (!settings || status === 'loading' || hasStorageAccess === undefined) {
    return (
      <Delayed delayMs={500}>
        <LoadingOverlay isActive />
      </Delayed>
    );
  }

  if (!isValidSettings) {
    return <ErrorSettingsCallout />;
  }

  if (!hasStorageAccess) {
    return (
      <Callout type="caution">Self-hosted integration requires third-party cookies to be allowed</Callout>
    );
  }

  if (status === 'error') {
    return <Callout type="error">Authentication could not be resolved.</Callout>;
  }

  if (status === 'unauthenticated') {
    return (
      <DashedBox>
        <VerticalRhythm gap="base" justify="center" align="center">
          <VerticalRhythm gap="xs">
            <Heading withMarginBottom={false}>Authentication required</Heading>
            <div>You need to log in to proceed.</div>
            <HorizontalRhythm justify="center" align="center">
              <LoginButton oauthTenant="assetbank.app" onLoggedIn={refresh} />
            </HorizontalRhythm>
          </VerticalRhythm>
        </VerticalRhythm>
      </DashedBox>
    );
  }

  return <>{children}</>;
};
