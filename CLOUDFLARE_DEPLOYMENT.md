# Cloudflare Pages Deployment Guide

This guide walks through deploying the Australian Capital Cities Street Names visualization to Cloudflare Pages.

## Prerequisites

- GitHub account with the repository pushed
- Cloudflare account (free tier works)
- Repository: `https://github.com/pqzdev/sydney-streets`

## Steps to Deploy

### 1. Connect GitHub Repository

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** in the left sidebar
3. Click **Create application**
4. Select the **Pages** tab
5. Click **Connect to Git**
6. Authorize Cloudflare to access your GitHub account
7. Select the `sydney-streets` repository

### 2. Configure Build Settings

**Project name**: `australian-streets` (or your preferred name)

**Production branch**: `main`

**Build settings**:
- Framework preset: **None** (static site)
- Build command: *(leave empty)*
- Build output directory: `/`

**Environment variables**: *(none required)*

### 3. Deploy

1. Click **Save and Deploy**
2. Cloudflare will build and deploy your site
3. Your site will be live at `https://australian-streets.pages.dev`

### 4. Custom Domain (Optional)

To use a custom domain:

1. Go to your Pages project settings
2. Click **Custom domains**
3. Add your domain (e.g., `streets.example.com`)
4. Follow DNS configuration instructions

## File Structure

The following files are served directly:

```
/
├── index.html              # Main application
├── app.js                  # JavaScript logic
├── data/
│   ├── sydney-roads-web.geojson
│   ├── melbourne-roads-web.geojson
│   ├── street_counts_grid200.json
│   └── melbourne_street_counts_grid200.json
├── _headers                # Security headers (Cloudflare Pages)
└── [other files...]
```

## Security Headers

The `_headers` file configures security headers:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
```

## Performance

Cloudflare Pages provides:
- Global CDN distribution
- Automatic HTTPS
- Unlimited bandwidth (free tier)
- Built-in DDoS protection
- Automatic builds on git push

## Updating the Site

To update the deployed site:

1. Push changes to the `main` branch:
   ```bash
   git add .
   git commit -m "Update description"
   git push origin main
   ```

2. Cloudflare Pages will automatically rebuild and deploy

## Troubleshooting

### Large Files

If deployment fails due to file size:
- Ensure `.gitignore` excludes large raw data files
- Only include web-optimized GeoJSON files (`*-web.geojson`)
- Maximum file size: 25 MB per file
- Maximum total: 20,000 files

### 404 Errors

If you get 404 errors:
- Verify `index.html` is in the root directory
- Check Build output directory is set to `/`
- Ensure all linked files use relative paths

### Performance Issues

If maps load slowly:
- Compress GeoJSON files (already done via `*-web.geojson` files)
- Enable browser caching via `_headers`
- Consider using CDN for large data files

## Data Files

### Sydney
- `data/sydney-roads-web.geojson` (7.2 MB) - Optimized street data
- `data/street_counts_grid200.json` (1.1 MB) - Pre-computed counts

### Melbourne
- `data/melbourne-roads-web.geojson` - Optimized street data (to be generated)
- `data/melbourne_street_counts_grid200.json` - Pre-computed counts (to be generated)

## Cost

Cloudflare Pages free tier includes:
- Unlimited sites
- Unlimited requests
- Unlimited bandwidth
- 500 builds per month
- 1 concurrent build

This project fits comfortably within the free tier.

## Monitoring

View deployment status and analytics:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click your project name
4. View **Deployments**, **Analytics**, and **Logs**
