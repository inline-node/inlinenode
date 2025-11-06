🧭 InlineNode – GitHub Pages Deployment Guide

InlineNode is a modular engineering suite built with Vite + React + TailwindCSS, designed for hosting on GitHub Pages with fully automated deployment via GitHub Actions.

This document describes the complete setup, configuration, and troubleshooting steps that turn a blank repository into a production-ready CI/CD pipeline.

🚀 Live Deployment

🌍 Live Site: https://inline-node.github.io/inlinenode/

💾 Repository: https://github.com/inline-node/inlinenode

⚙️ Actions Dashboard: GitHub Actions

🧱 Project Stack
Component Version Purpose
Node.js ≥ v20 Runtime
React ^18.3 UI framework
Vite ^5.x Build system
TailwindCSS ^3.4 Styling
gh-pages ^6.1 Manual deploy utility
peaceiris/actions-gh-pages v3 Automated GitHub Pages deploy
🧩 1. Project Setup

# Clone or create your folder

cd C:\Users\sunil
mkdir inlinenode
cd inlinenode

# Initialize project

npm create vite@latest . -- --template react

# Install dependencies

npm install

# Install Tailwind + PostCSS

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

🎨 2. Tailwind Configuration

tailwind.config.js

/** @type {import('tailwindcss').Config} \*/
export default {
content: [
"./index.html",
"./src/**/\*.{js,ts,jsx,tsx}",
],
theme: { extend: {} },
plugins: [],
}

src/index.css

@tailwind base;
@tailwind components;
@tailwind utilities;

Run locally:

npm run dev

If you see the “InlineNode Works!” screen, Tailwind is properly linked.

⚙️ 3. Configure Vite for GitHub Pages

vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
plugins: [react()],
base: '/inlinenode/', // Must match your GitHub repo name
})

🧠 4. Add Deploy Scripts

Install gh-pages:

npm install -D gh-pages

Add scripts in package.json:

"scripts": {
"dev": "vite",
"build": "vite build",
"preview": "vite preview",
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
}

✅ JSON must be perfectly valid: double quotes only, commas only between properties.

🔧 5. Initialize Git and Push
git init
git remote add origin https://github.com/<your-username>/inlinenode.git
git add .
git commit -m "Initial commit - setup InlineNode project"
git branch -M main
git push -u origin main

⚙️ 6. GitHub Actions Workflow

Create folders:

mkdir .github
mkdir .github\workflows

Add file .github/workflows/deploy.yml:

name: Deploy to GitHub Pages
on:
push:
branches: - main
jobs:
build-and-deploy:
runs-on: ubuntu-latest
steps: - name: Checkout
uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install and Build
        run: |
          npm ci
          npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist

This workflow auto-builds and publishes your site whenever you push to main.

🔐 7. Enable Workflow Permissions

Go to Settings → Actions → General

Under Workflow permissions, select:

✅ Read and write permissions

✅ Allow GitHub Actions to create and approve pull requests

Click Save

🌐 8. Enable GitHub Pages

Go to Settings → Pages

Source: Deploy from a branch

Branch: gh-pages

Folder: /(root)

Save

GitHub will now serve the site from the gh-pages branch.

🧾 9. Common Fixes
Error Cause Fix
EJSONPARSE Invalid JSON syntax Fix commas/quotes in package.json
Expected } but found : Invalid Vite config Use base: '/inlinenode/'
Permission denied to github-actions[bot] Insufficient permissions Enable “Read and write permissions”
No build output found Missing npm run build step Ensure npm ci && npm run build in workflow
🚀 10. Deploy
Automatic (via GitHub Actions)

Push to main:

git add .
git commit -m "Trigger auto deploy"
git push

GitHub Actions will build and deploy automatically.

Manual (via CLI)
npm run deploy

This directly pushes /dist to gh-pages.

✅ 11. Deployment Verification

Visit:

https://<your-username>.github.io/inlinenode/

If it displays your app (e.g., “InlineNode Works!”), the pipeline is complete.

🧩 12. Current Project State
Step Status
Tailwind Installed ✅
JSON Valid ✅
Vite Config Correct ✅
GitHub Actions Working ✅
Permissions Fixed ✅
Pages Live ✅
🧠 Notes for Future Phases

CurveLab module will live inside /src/modules/CurveLab

Tools calculators will have educational layouts + formula explanations

Both will reuse Tailwind + shadcn components for consistency

CI/CD workflow remains the same for all future updates

✨ Credits

Built and deployed by InlineNode Team
CI/CD powered by GitHub Actions + Vite + TailwindCSS
Maintained with enough caffeine to light up a 3-phase motor ⚡

📌 Quick Commands Reference
Action Command
Run Dev Server npm run dev
Build Locally npm run build
Manual Deploy npm run deploy
Push to GitHub git add . && git commit -m "update" && git push

added logo and favicon
