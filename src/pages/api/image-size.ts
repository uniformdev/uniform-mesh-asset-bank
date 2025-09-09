import { ImageSizeRequestPayload, ImageSizeResponsePayload } from '@lib';
import { NextApiRequest, NextApiResponse } from 'next';

// eslint-disable-next-line import/no-anonymous-default-export
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { imageUrl } = req.body as ImageSizeRequestPayload;

  if (!imageUrl) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const response = await fetch(decodeURI(imageUrl), {
    method: 'GET',
  });

  const result: ImageSizeResponsePayload = {
    size: parseInt(response.headers.get('content-length') ?? '0'),
  };

  res.status(response.status).json(result);
};
