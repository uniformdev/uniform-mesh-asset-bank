import { AssetBankClient } from './client';

export type RootFolderValidationResult = 'valid' | 'invalid' | 'empty';

/**
 * Validates a Root Folder ID string by fetching the corresponding access-level
 * from the Asset Bank API.
 *
 * Returns:
 *  - 'empty'   when the input is blank
 *  - 'valid'   when the API returns a folder with a matching ID
 *  - 'invalid' when the API returns nothing or throws
 */
export async function validateRootFolderIdValue(
  rawValue: string,
  client: Pick<AssetBankClient, 'getAccessLevelFolder'>
): Promise<RootFolderValidationResult> {
  const trimmed = rawValue.trim();
  if (!trimmed) return 'empty';
  try {
    const folder = await client.getAccessLevelFolder(trimmed);
    return folder?.id != null ? 'valid' : 'invalid';
  } catch {
    return 'invalid';
  }
}
