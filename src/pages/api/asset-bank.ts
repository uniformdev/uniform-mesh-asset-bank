import { ApiRequestPayload, PlainTextApiResult } from '@lib';
import { NextApiRequest, NextApiResponse } from 'next';

// eslint-disable-next-line import/no-anonymous-default-export
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { apiUrl, method, body, headers, token } = req.body as ApiRequestPayload;

  if (!apiUrl || !method) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const finalHeaders = headers ?? {
    Accept: 'application/json, text/plain',
  };

  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }

  const response = await fetch(decodeURI(apiUrl), {
    method: method,
    headers: Object.keys(finalHeaders).length ? finalHeaders : undefined,
    body: body ? JSON.stringify(body, null, 2) : undefined,
  });

  const text = await response.text();

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/plain')) {
    const plainTextResponse: PlainTextApiResult = { plainText: text };
    res.status(response.status).json(plainTextResponse);
    return;
  }

  try {
    const json = JSON.parse(text);
    const transformed = transformAccessLevelsResponse(json, apiUrl);
    res.status(response.status).json(transformed);
  } catch {
    res.status(response.status).send(text);
  }
};

/**
 * Apply access-levels–specific transformations to keep payloads small.
 * Returns the original json unchanged for non-access-level endpoints.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformAccessLevelsResponse(json: any, apiUrl: string): any {
  if (!apiUrl.includes('/rest/access-levels')) {
    return json;
  }

  // /rest/access-levels (list) — strip full URLs down to relative /rest/… paths
  if (isAccessLevelsList(json, apiUrl)) {
    return stripAccessLevelUrls(json);
  }

  // /rest/access-levels/{id} (single) — strip the subtree to one depth level
  if (isAccessLevelSingle(json, apiUrl)) {
    return stripToOneLevel(json);
  }

  return json;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAccessLevelsList(json: any, apiUrl: string): json is string[] {
  return (
    Array.isArray(json) &&
    json.length > 0 &&
    typeof json[0] === 'string' &&
    !apiUrl.match(/\/rest\/access-levels\/\d/)
  );
}

/**
 * The list endpoint returns full absolute URLs per folder root.
 * Strip to relative /rest/… paths so the client fetcher reconstructs via its apiHost.
 */
function stripAccessLevelUrls(urls: string[]): string[] {
  return urls.map((url) => {
    try {
      return new URL(url).pathname.replace(/^.*?(\/rest\/)/, '$1');
    } catch {
      return url;
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAccessLevelSingle(json: any, apiUrl: string): boolean {
  return (
    !Array.isArray(json) &&
    typeof json === 'object' &&
    json !== null &&
    !!apiUrl.match(/\/rest\/access-levels\/\d/)
  );
}

/**
 * The single-folder endpoint returns the full subtree which can be many MBs.
 * Strip to one depth level to stay within Vercel's function response size limits.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripToOneLevel(node: any) {
  return {
    id: node.id,
    name: node.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: (Array.isArray(node.children) ? node.children : []).map((child: any) => ({
      id: child.id,
      name: child.name,
      children: [],
    })),
  };
}
