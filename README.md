# Uniform Asset Bank

Asset Bank integration for Uniform DXP

## Features

- Overview image assets from your Asset Bank account
- Use image assets for Uniform Assets parameter

## Installation

### Prerequisites

- A Uniform team and project
- An Asset Bank account with Enterprise subscription and [Asset Transformer Module](https://support.assetbank.co.uk/hc/en-gb/articles/360001011032-Asset-Transformer-Module)
- Read the integration [documentation](https://docs.uniform.app/docs/integrations/dam/asset-bank)

### Create Asset Bank OAuth app

1. Go to Asset Bank Dashboard => System => API
1. Click `Add new OAuth2 credentials`
1. Update **Name** and **Secret**
1. Update **Redirect URLs**: `<VERCEL_SITE_URL>/api/auth/callback/assetbank.app` (e.g `https://uniform-mesh-asset-bank.vercel.app/api/auth/callback/assetbank.app`)
1. Click `Save`

### Deploy Mesh Integration

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Funiformdev%2Funiform-mesh-asset-bank&env=ASSET_BANK_ACCOUNT_URL,NEXTAUTH_SECRET,AUTH_APP_ID,AUTH_APP_SECRET&envDescription=see%20README%20for%20more%20info&envLink=https%3A%2F%2Fgithub.com%2Funiformdev%2Funiform-mesh-asset-bank%3Ftab%3Dreadme-ov-file%23deploy-mesh-integration&project-name=uniform-mesh-asset-bank&repository-name=uniform-mesh-asset-bank)

Asset Bank integration requires a few environment variables:

- **ASSET_BANK_ACCOUNT_URL** - your Asset Bank account URL (e.g. `https://company.assetbank.app/assetbank-company`)
- **NEXTAUTH_URL (optional)** - your Vercel site URL (e.g. `https://asset-bank.vercel.app`)
- **NEXTAUTH_SECRET** - secret key for NextAuth to sign and encrypt JWT tokens and cookies
- **AUTH_APP_ID** - OAuth application ID for Asset Bank authentication
- **AUTH_APP_SECRET** - OAuth application secret for Asset Bank authentication

#### Manual deployment

1. Fork this repository (optional)
1. Create Vercel project based on the repository
1. Configure Vercel environment variables (see the list above)

### Register Mesh Integration

1. Go to Uniform dashboard => Your team => Settings => Custom Integrations
1. Click `Add Integration` and copy-paste manifest from `mesh-manifest.stable.json`
1. Replace `http://localhost:4064` in the manifest with previously deployed Vercel's site URL
1. Click `Save`

## Local development

To run the integration locally:

1. Install dependencies: `npm install`
1. Copy `.env.example` to `.env` and define required environment variables
1. Start the development server: `npm run dev`
1. Register a custom integration for your team using manifest from `mesh-manifest.local.json`
1. Register a separate Asset Bank OAuth app, use `http://localhost:4064/api/auth/callback/assetbank.app` for **Redirect URLs**
