import { useAsyncRetry } from 'react-use';

import {
  Asset,
  ASSET_ORIENTATIONS,
  AssetBankClient,
  mapSingleAssetResultToPreview,
  PlainTextApiResult,
  SingleUserApiResult,
  WELL_KNOWN_ATTRIBUTES,
} from '@lib';

export const useGetAssetDetails = ({
  client,
  id,
}: {
  client: AssetBankClient | null | undefined;
  id: string;
}): ReturnType<typeof useAsyncRetry<Asset | null>> => {
  return useAsyncRetry(async () => {
    if (!client || !id) {
      return null;
    }

    const assetApiResult = await client.getAssetDetails({
      id,
    });

    const asset = assetApiResult
      ? mapSingleAssetResultToPreview({
          asset: assetApiResult,
        })
      : null;

    if (!asset) {
      return null;
    }

    if (asset.contentUrlUrl) {
      asset.uniformUrl = (await client.getByUrl<PlainTextApiResult>(asset.contentUrlUrl))?.plainText ?? '';
    }

    const addedBy = asset.attributes?.find((a) => a.name === WELL_KNOWN_ATTRIBUTES.addedBy.name);
    const lastModifiedBy = asset.attributes?.find(
      (a) => a.name === WELL_KNOWN_ATTRIBUTES.lastModifiedBy.name
    );

    const users = await getUniqueUsers(client, [addedBy?.value, lastModifiedBy?.value]);

    // rewrite user ID values with email address
    if (addedBy && addedBy.value) {
      addedBy.value = users[addedBy.value]?.emailAddress ?? addedBy.value;
    }

    if (lastModifiedBy && lastModifiedBy.value) {
      lastModifiedBy.value = users[lastModifiedBy.value]?.emailAddress ?? lastModifiedBy.value;
    }

    const orientation = asset.attributes?.find((a) => a.name === WELL_KNOWN_ATTRIBUTES.orientation.name);
    if (orientation && orientation.value) {
      orientation.value = ASSET_ORIENTATIONS[orientation.value] ?? orientation.value;
    }

    return asset;
  }, [client, id]);
};

const getUniqueUsers = async (
  client: AssetBankClient,
  ids: Array<string | undefined>
): Promise<Record<string, SingleUserApiResult | undefined>> => {
  const validIds = ids.filter((x) => x && Number(x) > 0).map(Number);
  const uniqueIds = Array.from(new Set(validIds));

  const users = await Promise.all(uniqueIds.map((id) => client.getUser({ id })));
  const validUsers = users.filter((x) => !!x);

  return validUsers.reduce<Record<string, SingleUserApiResult>>((acc, user) => {
    acc[String(user.id)] = user;
    return acc;
  }, {});
};
