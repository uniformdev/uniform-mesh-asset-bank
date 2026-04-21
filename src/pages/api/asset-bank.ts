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

    // The /rest/access-levels list endpoint returns an array of full URLs, one per folder root:
    //   ["https://host/appname/rest/access-levels/1", ...]
    // For large installations this can be tens of thousands of entries and the redundant
    // host+app-path prefix makes the payload enormous. Strip each entry down to the
    // /rest/... relative path so the client fetcher can reconstruct the full URL via its apiHost.
    if (
      Array.isArray(json) &&
      json.length > 0 &&
      typeof json[0] === 'string' &&
      apiUrl.includes('/rest/access-levels') &&
      !apiUrl.match(/\/rest\/access-levels\/\d/)
    ) {
      const stripped = (json as string[]).map((url) => {
        try {
          return new URL(url).pathname.replace(/^.*?(\/rest\/)/, '$1');
        } catch {
          return url;
        }
      });
      res.status(response.status).json(stripped);
      return;
    }

    // The /rest/access-levels/{id} endpoint returns a single folder with its full subtree.
    // Large installations can have very deep trees (many MBs). Strip children to a single
    // depth layer so the payload stays within Vercel's function response size limits.
    if (
      !Array.isArray(json) &&
      typeof json === 'object' &&
      json !== null &&
      apiUrl.match(/\/rest\/access-levels\/\d/)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripToOneLevel = (node: any) => ({
        id: node.id,
        name: node.name,
        children: (Array.isArray(node.children) ? node.children : []).map((child: any) => ({
          id: child.id,
          name: child.name,
          children: [],
        })),
      });
      res.status(response.status).json(stripToOneLevel(json));
      return;
    }

    res.status(response.status).json(json);
  } catch {
    res.status(response.status).send(text);
  }
};
