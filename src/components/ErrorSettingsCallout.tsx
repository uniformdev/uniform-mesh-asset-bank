import React from 'react';
import { Callout } from '@uniformdev/mesh-sdk-react';

const ErrorSettingsCallout = () => (
  <Callout type="error">
    It appears the Asset Bank integration is not configured. Please visit the &quot;Settings &gt; Integrations
    &gt; Asset Bank&quot; (header navigation) page.
  </Callout>
);

export default ErrorSettingsCallout;
