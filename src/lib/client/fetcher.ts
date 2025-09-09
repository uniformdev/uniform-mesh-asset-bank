import pThrottle from 'p-throttle';
import pRetry from 'p-retry';

import { ApiRequestPayload } from '@lib';
import { ApiError, RateLimitError } from './errors';
import { isAbsoluteUrl } from 'next/dist/shared/lib/utils';

export type ApiFetcher = <TResult>(url: string) => Promise<TResult | null>;

export const createInBrowserFetcher = ({
  apiHost,
  token,
  rateLimit,
}: {
  apiHost: string;
  token: string;
  rateLimit: number;
}): ApiFetcher => {
  return createFetcherInternal({
    apiHost,
    token,
    rateLimit,
    doFetch: async (apiUrl: string, token: string) => {
      return fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    },
  });
};

export const createCorsFetcher = ({
  apiHost,
  token,
  rateLimit,
}: {
  apiHost: string;
  token: string;
  rateLimit: number;
}): ApiFetcher => {
  return createFetcherInternal({
    apiHost,
    token,
    rateLimit,
    doFetch: async (apiUrl: string, token: string) => {
      const payload: ApiRequestPayload = {
        method: 'GET',
        apiUrl,
        token,
      };

      return await fetch('/api/asset-bank', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  });
};

const createFetcherInternal = ({
  apiHost,
  token,
  rateLimit,
  doFetch,
}: {
  apiHost: string;
  token: string;
  rateLimit: number;
  doFetch: (apiUrl: string, token: string) => Promise<Response>;
}): ApiFetcher => {
  if (!apiHost) {
    throw new Error('missing apiHost');
  }

  if (!token) {
    throw new Error('missing token');
  }

  // Asset Bank API rate limits:
  // Shared - 2 requests per second
  // Dedicated - 15 requests per second
  // https://support.assetbank.co.uk/hc/en-gb/articles/360004734038-Rate-Limiting
  const throttler = pThrottle({
    limit: rateLimit,
    interval: 1000,
    strict: true,
  });

  const validApiHost = apiHost.endsWith('/') ? apiHost.slice(0, -1) : apiHost;

  return async <TResult>(url: string): Promise<TResult | null> => {
    if (!url) {
      return null;
    }

    const apiUrl = isAbsoluteUrl(url) ? url : `${validApiHost}${url}`;

    return pRetry<TResult | null>(
      throttler(async () => {
        const response = await doFetch(apiUrl, token);
        if (!response.ok) {
          if (response.status === 429) {
            throw new RateLimitError(apiUrl);
          }

          throw new ApiError(response.status, apiUrl);
        }

        try {
          const json: TResult = await response.json();
          return json;
        } catch (error: unknown) {
          if (error instanceof Error) {
            // eslint-disable-next-line no-console
            console.warn(error.message);
          }
        }

        return null;
      }),
      {
        retries: 3,
        factor: 1.66,
        onFailedAttempt: (error) => {
          if (
            error instanceof ApiError &&
            error.statusCode >= 400 &&
            error.statusCode < 500 &&
            error.statusCode !== 429 &&
            error.statusCode !== 408
          ) {
            // We don't want to retry 4xx (client-side issues), throwing here will prevent
            // further retries
            throw error;
          }
        },
      }
    );
  };
};
