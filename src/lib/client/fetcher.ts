import pRetry from 'p-retry';

import { ApiRequestPayload } from '@lib';
import { ApiError, RateLimitError } from './errors';
import { isAbsoluteUrl } from 'next/dist/shared/lib/utils';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
  //
  // Requests are queued and dispatched at most once every `minIntervalMs` (1000/rateLimit).
  // On a 429 the entire queue is paused for one full rate-limit window + a small buffer so
  // all in-flight and buffered requests back off together instead of cascading.
  const minIntervalMs = Math.ceil(1000 / rateLimit);
  const queue: Array<() => void> = [];
  let lastDispatch = 0;
  let backoffUntil = 0;
  let isDraining = false;

  async function drainQueue() {
    if (isDraining) return;
    isDraining = true;

    while (queue.length > 0) {
      // Global back-pressure: wait out the cooldown window on 429.
      // `continue` restarts the loop so all conditions are re-evaluated after waking.
      const backoffRemaining = backoffUntil - Date.now();
      if (backoffRemaining > 0) {
        await sleep(backoffRemaining);
        continue;
      }

      // Rate-limit spacing: ensure at least minIntervalMs between dispatches.
      // `continue` restarts the loop so back-pressure is re-checked after the sleep
      // (a 429 arriving while we wait here must still be honoured).
      const sinceLastDispatch = Date.now() - lastDispatch;
      if (sinceLastDispatch < minIntervalMs) {
        await sleep(minIntervalMs - sinceLastDispatch);
        continue;
      }

      const task = queue.shift();
      if (task) {
        lastDispatch = Date.now();
        // Fire without awaiting: we control dispatch rate, not completion rate
        task();
      }
    }

    isDraining = false;
  }

  const validApiHost = apiHost.endsWith('/') ? apiHost.slice(0, -1) : apiHost;

  // Enqueues doFetch and resolves/rejects when the request completes
  const queuedFetch = (apiUrl: string): Promise<Response> =>
    new Promise((resolve, reject) => {
      queue.push(() => doFetch(apiUrl, token).then(resolve, reject));
      void drainQueue();
    });

  return async <TResult>(url: string): Promise<TResult | null> => {
    if (!url) {
      return null;
    }

    const apiUrl = isAbsoluteUrl(url) ? url : `${validApiHost}${url}`;

    return pRetry<TResult | null>(
      async () => {
        const response = await queuedFetch(apiUrl);

        if (!response.ok) {
          if (response.status === 429) {
            // Back-pressure: pause the whole queue for a full rate-limit window
            backoffUntil = Date.now() + 1000 + 50;
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
      },
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
            // Don't retry 4xx client errors (except 429 and 408)
            throw error;
          }
        },
      }
    );
  };
};
