import { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input, useMeshLocation, Label, Switch, LoadingIndicator } from '@uniformdev/mesh-sdk-react';
import {
  Caption,
  Chip,
  Details,
  DismissibleChipAction,
  FieldMessage,
  HorizontalRhythm,
  Icon,
  Link,
  Popover,
  scrollbarStyles,
  toast,
  ToastContainer,
  Tooltip,
  VerticalRhythm,
} from '@uniformdev/design-system';

import {
  DEFAULT_RATE_LIMIT,
  IntegrationSettingsValidated,
  integrationSettingsSchema,
  WELL_KNOWN_ATTRIBUTES,
} from '@lib';
import { useAssetBankClient, useIsValidAccountUrl, useReadAuthState } from '@hooks';
import { LoginButton } from '@components/auth/LoginButton';
import { InputOptionSelector } from '@components/InputOptionSelector';
import { LogoutButton } from '@components/auth/LogoutButton';

type Filter = {
  type: 'attribute' | 'folder';
  label: string;
  id: number;
  required?: boolean;
};

type Settings = IntegrationSettingsValidated;

export default function SettingsPage() {
  const { value, setValue } = useMeshLocation<'settings', Settings>();

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setValue: setFormValue,
    formState: { errors, isSubmitting },
  } = useForm<Settings>({
    resolver: zodResolver(integrationSettingsSchema),
    mode: 'onSubmit',
    defaultValues: {
      apiHost: value.apiHost ?? '',
      assetTransformerUrl: value.assetTransformerUrl ?? '',
      assetTransformerPresets: value.assetTransformerPresets ?? [],
      rateLimit: value.rateLimit ?? DEFAULT_RATE_LIMIT,
      attributes: value.attributes ?? [],
      uniformAssetAttributes: value.uniformAssetAttributes ?? [],
      folders: value.folders ?? [],
      rootFolder: value.rootFolder,
    } satisfies Settings,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncIncludeFolders, setSyncIncludeFolders] = useState(true);

  const apiHost = useWatch<Settings, 'apiHost'>({ control, name: 'apiHost' });
  const attributes = useWatch<Settings, 'attributes'>({ control, name: 'attributes' });
  const folders = useWatch<Settings, 'folders'>({ control, name: 'folders' });
  const rootFolder = useWatch<Settings, 'rootFolder'>({ control, name: 'rootFolder' });
  const uniformAssetAttributes = useWatch<Settings, 'uniformAssetAttributes'>({
    control,
    name: 'uniformAssetAttributes',
  });
  const rateLimit = useWatch<Settings, 'rateLimit'>({ control, name: 'rateLimit' });
  const assetTransformerPresets = useWatch<Settings, 'assetTransformerPresets'>({
    control,
    name: 'assetTransformerPresets',
  });

  const { optionalFilters, requiredFilters } = useMemo(() => {
    const attributeFilters = attributes.map<Filter>((attr) => ({
      type: 'attribute',
      label: `${attr.id} - ${attr.label}`,
      id: attr.id,
      required: attr.label === WELL_KNOWN_ATTRIBUTES.fileFormat.label,
    }));

    const folderFilters = folders.map<Filter>((folder) => ({
      type: 'folder',
      label: folder.path,
      id: folder.id,
    }));

    const filters = [...attributeFilters, ...folderFilters];

    return {
      optionalFilters: filters.filter((f) => !f.required),
      requiredFilters: filters.filter((f) => f.required),
    };
  }, [attributes, folders]);

  const isValidAccountUrl = useIsValidAccountUrl(apiHost);

  const auth = useReadAuthState({ apiHost });
  const isAuthenticated = auth.value?.status === 'authenticated';

  // sync filters automatically when authenticated and no attributes defined yet
  useEffect(() => {
    if (isAuthenticated && !attributes.length) {
      syncFilters();
    }
    // ignore `attributes` here to avoid endless loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const client = useAssetBankClient({
    apiHost: auth.value?.apiHost,
    accessToken: auth.value?.accessToken,
    rateLimit,
  });

  const assetTransformerPageUrl = useMemo(
    () => `https://transformer-frontend.assetbank.app/cropSizes?authUrl=${apiHost}/action/secureLinkToApp`,
    [apiHost]
  );

  const handleSave = async (newSettings: Settings) => {
    try {
      const isValidCreds = await client?.isValidAccessToken();
      if (!isValidCreds) {
        toast.error('Could not connect to the Asset Bank API.');
        return;
      }

      await setValue(() => ({ newValue: newSettings }));

      toast.success('Settings have been saved');
    } catch (error) {
      toast.error('Could not save settings');
    }
  };

  const removeFilter = (filter: Filter) => {
    if (filter.required) {
      return;
    }

    if (filter.type === 'attribute') {
      setFormValue(
        'attributes',
        attributes.filter((a) => a.id !== filter.id)
      );
    } else {
      setFormValue(
        'folders',
        folders.filter((a) => a.id !== filter.id)
      );
    }
  };

  const syncFilters = useCallback(async () => {
    if (!client) {
      return;
    }

    try {
      setIsSyncing(true);

      setFormValue('attributes', []);
      setFormValue('folders', []);

      const attributes = ((await client.getAttributes()) ?? []).map((a) => ({
        id: a.id,
        label: a.label,
        typeId: a.typeId,
        listValues: a.listValues.map((x) => ({ value: x.value, label: x.label })),
      }));
      const folders = syncIncludeFolders ? ((await client.getFlatFolders()) ?? []) : [];

      setFormValue('attributes', attributes);
      setFormValue('folders', folders);
    } finally {
      setIsSyncing(false);
    }
  }, [client, syncIncludeFolders, setFormValue]);

  return (
    <form onSubmit={handleSubmit(handleSave)}>
      <VerticalRhythm gap="base" style={{ margin: 'var(--spacing-xs)' }}>
        <ToastContainer autoCloseDelay="normal" limit={5} />
        <HorizontalRhythm gap="md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <VerticalRhythm gap="base" className="full-width-caption">
            <Input
              {...register('apiHost')}
              label="Account URL"
              placeholder="https://company.assetbank.app/assetbank-company"
              icon={<AccountUrlIcon isValidAccountUrl={isValidAccountUrl} />}
              errorMessage={errors.apiHost?.message}
            />
            <Input
              {...register('assetTransformerUrl')}
              label={
                <HorizontalRhythm gap="sm" align="center" style={{ flexGrow: 1 }}>
                  <span css={{ flexGrow: 1 }}>Asset Transformer URL</span>
                  {isValidAccountUrl ? (
                    <Link text="Asset Transformer" href={assetTransformerPageUrl} external />
                  ) : null}
                </HorizontalRhythm>
              }
              caption="Requires the enterprise Asset Transformer module; allows optimized web delivery"
              placeholder="https://d54otazn342w10.cloudfront.net/externalApps/435fe330-287c-46bc-9b96-bbf41bdc55c5"
              errorMessage={errors.assetTransformerUrl?.message}
            />
            <AssetTransformerPresets
              value={assetTransformerPresets}
              onUpdate={(newValues) => setFormValue('assetTransformerPresets', newValues)}
              error={errors.assetTransformerPresets?.message}
            />
            <Details summary="Advanced" isIndented>
              <VerticalRhythm gap="base" css={{ maxWidth: '70%' }}>
                <div
                  css={css`
                    & p {
                      margin: 0;
                      margin-top: var(--spacing-xs);
                    }
                  `}
                >
                  <Switch
                    label={
                      <HorizontalRhythm gap="sm" align="center" justify="flex-start">
                        <span>Enable higher rate limits</span>
                        <RateLimitPopover />
                      </HorizontalRhythm>
                    }
                    infoText="Dedicated Asset Bank hosting allows higher API rates"
                    checked={rateLimit === 15}
                    onChange={(e) => setFormValue('rateLimit', e.target.checked ? 15 : 2)}
                  />
                </div>
                <InputOptionSelector
                  label="Restrict to folder"
                  caption="Assets outside this folder will not be accessible"
                  isDisabled={!folders.length}
                  isMulti={false}
                  options={folders.map((a) => ({
                    label: a.path,
                    value: String(a.id),
                  }))}
                  value={
                    rootFolder
                      ? {
                          label: rootFolder.path,
                          value: String(rootFolder.id),
                        }
                      : undefined
                  }
                  onChange={(newValue) => {
                    setFormValue(
                      'rootFolder',
                      folders.find((a) => a.id === Number(newValue?.value)) ?? undefined
                    );
                  }}
                />
              </VerticalRhythm>
            </Details>

            <HorizontalRhythm gap="base">
              <Button
                type="submit"
                buttonType="secondary"
                onClick={() => trigger()}
                disabled={isSyncing || isSubmitting}
              >
                Save
              </Button>
            </HorizontalRhythm>
          </VerticalRhythm>

          <VerticalRhythm
            gap="sm"
            css={{
              padding: 'var(--spacing-base)',
              border: '1px solid var(--gray-300)',
              borderRadius: 'var(--rounded-sm)',
              maxHeight: 'max-content',
            }}
          >
            <VerticalRhythm gap="sm">
              <div>Sync account details</div>
              <HorizontalRhythm gap="sm" justify="flex-start" align="center">
                {isAuthenticated ? (
                  <LogoutButton isAuthenticated={true} email={auth.value?.email} authRefresh={auth.retry} />
                ) : (
                  <LoginButton
                    oauthTenant="assetbank.app"
                    onLoggedIn={auth.retry}
                    variant="soft"
                    disabled={!isValidAccountUrl}
                    tooltip={!isValidAccountUrl ? 'Account URL required to login' : undefined}
                  />
                )}
                <Popover buttonText="Info" placement="right" iconColor="action" maxWidth="24rem">
                  This login is used only for configuring the Asset Bank integration and stored for your
                  session only. Individual Uniform users will need their own Asset Bank login to manage assets
                </Popover>
              </HorizontalRhythm>
            </VerticalRhythm>

            <HorizontalRhythm gap="sm" justify="flex-start" align="center">
              <div css={{ flexGrow: 1 }}>Filters</div>
              <Button
                buttonType="primary"
                size="zero"
                variant="soft"
                disabled={!isAuthenticated || isSyncing}
                onClick={syncFilters}
                style={{
                  borderRadius: 'var(--rounded-2xl)',
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  opacity: !isAuthenticated ? 'var(--opacity-50)' : undefined,
                }}
              >
                <HorizontalRhythm gap="sm" justify="flex-start" align="center">
                  <RefreshIcon />
                  Resync
                </HorizontalRhythm>
              </Button>
              <Switch
                name="includeFolders"
                label="Include folders"
                switchSize="sm"
                checked={syncIncludeFolders}
                onChange={(e) => setSyncIncludeFolders(e.target.checked)}
                disabled={!isAuthenticated}
              />
            </HorizontalRhythm>
            {isSyncing ? (
              <HorizontalRhythm
                gap="sm"
                justify="flex-start"
                align="center"
                style={{ marginTop: 'var(--spacing-sm)' }}
              >
                <LoadingIndicator size="lg" color="gray" />
              </HorizontalRhythm>
            ) : null}
            {optionalFilters.length > 0 ? (
              <VerticalRhythm gap="xs">
                <div>Optional</div>
                <HorizontalRhythm
                  gap="sm"
                  css={[
                    {
                      flexWrap: 'wrap',
                      marginBottom: 'var(--spacing-sm)',
                      maxHeight: '12rem',
                      overflow: 'auto',
                    },
                    scrollbarStyles,
                  ]}
                >
                  {optionalFilters.map((filter) => (
                    <FilterChip key={`${filter.type}-${filter.id}`} filter={filter} onRemove={removeFilter} />
                  ))}
                </HorizontalRhythm>
              </VerticalRhythm>
            ) : null}
            {requiredFilters.length > 0 ? (
              <VerticalRhythm gap="xs">
                <div>Required</div>
                <HorizontalRhythm gap="sm" css={{ flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                  {requiredFilters.map((filter) => (
                    <FilterChip key={`${filter.type}-${filter.id}`} filter={filter} />
                  ))}
                </HorizontalRhythm>
              </VerticalRhythm>
            ) : null}
            <Caption>Asset Bank attributes to be used as filters in Uniform</Caption>
            <FieldMessage errorMessage={errors.attributes?.message} />

            <InputOptionSelector
              label="Additional asset metadata"
              caption="Select Asset Bank attributes to include in front-end payload"
              isMulti={true}
              isDisabled={!attributes.length}
              options={attributes.map((a) => ({
                label: `${a.id} - ${a.label}`,
                value: String(a.id),
              }))}
              value={uniformAssetAttributes.map((a) => ({
                label: a.label,
                value: String(a.id),
              }))}
              onChange={(newValues) =>
                setFormValue(
                  'uniformAssetAttributes',
                  newValues.map((x) => ({
                    id: Number(x.value),
                    label: x.label,
                  }))
                )
              }
            />
          </VerticalRhythm>
        </HorizontalRhythm>
      </VerticalRhythm>
    </form>
  );
}

const AccountUrlIcon = ({ isValidAccountUrl }: { isValidAccountUrl: boolean | undefined }) => {
  if (isValidAccountUrl === undefined) {
    return undefined;
  }

  return isValidAccountUrl ? <SuccessIcon /> : <CautionIcon />;
};

const SuccessIcon = () => (
  <span css={{ color: 'var(--utility-success-icon)' }}>
    <Icon icon="check-o" iconColor="currentColor" size="1.25rem" />
  </span>
);

const CautionIcon = () => (
  <Tooltip title="Please check the account URL" placement="bottom">
    <span css={{ color: 'var(--utility-caution-icon)' }}>
      <Icon icon="warning" iconColor="currentColor" size="1.25rem" />
    </span>
  </Tooltip>
);

const RefreshIcon = () => (
  <span css={{ color: 'var(--utility-info-icon)' }}>
    <Icon icon="refresh" iconColor="currentColor" size="1.25rem" />
  </span>
);

const AssetTransformerPresets = ({
  value,
  onUpdate,
  error,
}: {
  value: string[];
  onUpdate: (value: string[]) => void;
  error?: string;
}) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input) {
      return;
    }

    const newValues = input.split(',').map((x) => x.trim());
    const uniqueValues = Array.from(new Set([...value, ...newValues]));

    onUpdate(uniqueValues);
    setInput('');
  };

  const handleRemove = (preset: string) => {
    onUpdate(value.filter((x) => x !== preset));
  };

  return (
    <VerticalRhythm gap="sm" className="full-width-caption">
      <VerticalRhythm gap="0">
        <Label>Allowed transformation identifiers</Label>
        <Caption>
          List the preset transformation identifiers from your Asset Transformer that are allowed in Uniform.
          Adding transformation identifiers that don’t exist in Asset Bank will result in a 404 error
        </Caption>
      </VerticalRhythm>
      <HorizontalRhythm gap="sm" css={{ flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
        {value.map((preset) => (
          <Chip
            key={preset}
            theme="neutral-light"
            size="sm"
            variant="solid"
            text={preset}
            chipAction={<DismissibleChipAction onDismiss={() => handleRemove(preset)} />}
            className="xs-chip"
          />
        ))}
      </HorizontalRhythm>
      <HorizontalRhythm gap="sm" justify="flex-start" align="center">
        <Input
          showLabel={false}
          onChange={(e) => setInput(e.target.value ?? '')}
          value={input}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAdd();
              // avoid form submission
              e.preventDefault();
            }
          }}
          style={{
            maxHeight: '40px',
            minHeight: 'unset',
          }}
        />
        <Button buttonType="secondaryInvert" onClick={handleAdd}>
          Add
        </Button>
      </HorizontalRhythm>
      <FieldMessage errorMessage={error} />
    </VerticalRhythm>
  );
};

const RateLimitPopover = () => (
  <Popover buttonText="Info" placement="right-end" iconColor="action" maxWidth="22rem">
    <VerticalRhythm gap="sm">
      <p>
        Higher rate limits are available with dedicated hosting, this toggle helps Uniform be a good API
        consumer
      </p>
      <VerticalRhythm gap="sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <p>Shared hosting:</p>
        <p>2 requests/second per IP address</p>
        <p>Dedicated hosting:</p>
        <p>15 requests/second per IP address</p>
      </VerticalRhythm>
      <Link
        text="Learn more"
        href="https://support.assetbank.co.uk/hc/en-gb/articles/360004734038-Rate-Limiting"
        external
      />
    </VerticalRhythm>
  </Popover>
);

const FilterChip = ({ filter, onRemove }: { filter: Filter; onRemove?: (filter: Filter) => void }) => {
  return (
    <Chip
      key={filter.id}
      className="xs-chip"
      theme="neutral-light"
      size="sm"
      variant="solid"
      text={filter.label}
      icon={filter.type === 'folder' ? 'folder' : undefined}
      chipAction={onRemove ? <DismissibleChipAction onDismiss={() => onRemove(filter)} /> : undefined}
    />
  );
};
