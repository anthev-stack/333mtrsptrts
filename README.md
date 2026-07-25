# 333 Motorsports — Shopify Theme

Custom Shopify Online Store 2.0 theme for **333 Motorsports**, based on Shopify's official Skeleton theme.

## Theme structure

```
assets/      CSS, JS, images
blocks/      Reusable theme blocks
config/      Theme settings
layout/      theme.liquid wrappers
locales/     Translations
sections/    Page sections
snippets/    Reusable Liquid partials
templates/   JSON templates
```

Theme files live at the **repo root** so Shopify can import this repository via GitHub.

## Push to GitHub

1. Create a new empty repository on GitHub (no README/license — this folder already has them).
2. In this folder, connect and push:

```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git add .
git commit -m "Initial 333 Motorsports Shopify theme"
git branch -M main
git push -u origin main
```

## Import into Shopify from GitHub

1. In Shopify admin, install the [Shopify GitHub app](https://apps.shopify.com/github) if you have not already.
2. Go to **Online Store → Themes**.
3. Click **Add theme → Connect from GitHub**.
4. Choose your account/org, this repository, and the `main` branch.

Shopify will add the theme to your library and keep it in sync with that branch.

## Local development (optional)

Install the Shopify CLI, then preview against your store:

```powershell
npm install -g @shopify/cli @shopify/theme
shopify theme dev --store YOUR-STORE.myshopify.com
```

## Notes

- Edits in the Shopify theme editor are committed back to the connected GitHub branch by Shopify.
- Pushing commits to the connected branch updates the theme in Shopify.
