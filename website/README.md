# YanoGen-Ts Documentation Website

This directory contains the [Docusaurus](https://docusaurus.io/) website for YanoGen-Ts documentation.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10.14.0+

### Development

```bash
cd website
pnpm install
pnpm start
```

This starts a local development server at http://localhost:3000. Most changes are reflected live without having to restart the server.

### Build

```bash
cd website
pnpm build
```

This generates static content into the `build` directory that can be served by any static hosting service.

### Serve Production Build Locally

```bash
cd website
pnpm serve
```

This serves the production build locally for testing.

## 📁 Structure

```
website/
├── docs/                    # Documentation markdown files
│   ├── getting-started.md   # Getting started guide
│   ├── cli-usage.md         # CLI documentation
│   ├── client-generation.md # Client generation guide
│   ├── server-generation.md # Server generation guide
│   ├── examples.md          # Usage examples
│   ├── api-reference.md     # Complete API reference
│   └── comparison.md        # Comparison with other tools
├── src/
│   ├── components/          # React components
│   ├── css/                 # Custom CSS
│   └── pages/               # Custom pages
├── static/                  # Static assets
│   └── img/                 # Images and icons
├── docusaurus.config.ts     # Docusaurus configuration
├── sidebars.ts              # Sidebar configuration
└── package.json             # Dependencies and scripts
```

## 🚀 Deployment

### Automatic Deployment (Recommended)

The website is automatically deployed to GitHub Pages using GitHub Actions whenever changes are pushed to the main branch.

**GitHub Actions Workflow**: `.github/workflows/deploy-docs.yml`

The website will be available at: `https://gunzip.github.io/yanogen-ts/`

### GitHub Pages Setup

To enable GitHub Pages deployment:

1. Go to your repository **Settings**
2. Navigate to **Pages** section
3. Select **GitHub Actions** as the source
4. The workflow will handle the rest automatically

For more information about Docusaurus, visit [docusaurus.io](https://docusaurus.io/).
