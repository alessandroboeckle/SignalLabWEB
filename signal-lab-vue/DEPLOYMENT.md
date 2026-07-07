# Deployment Guide: Signal Lab on GitHub Pages

This guide shows you how to deploy the Signal Lab application to GitHub Pages.

## Option 1: Automatic Deployment (Recommended)

The project includes GitHub Actions workflow that automatically builds and deploys to GitHub Pages.

### Setup Steps:

1. **Create a GitHub Repository**
   - Go to https://github.com/new
   - Create a new repository named `signal-lab` (or any name you prefer)
   - Don't initialize with README or .gitignore (we already have them)

2. **Push Your Code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Signal Lab web app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/signal-lab.git
   git push -u origin main
   ```

3. **Enable GitHub Pages in Repository Settings**
   - Go to your repository on GitHub
   - Click "Settings" (top right)
   - Scroll down to "Pages" section
   - Under "Source", select "GitHub Actions"
   - The workflow will automatically trigger on the next push

4. **Access Your Live Site**
   - Wait for the "Deploy to GitHub Pages" action to complete
   - Your site will be available at: `https://YOUR_USERNAME.github.io/signal-lab/`

### Automatic Deployments

The `.github/workflows/deploy.yml` workflow will:
- Trigger automatically on every push to the main branch
- Install dependencies
- Build the application
- Deploy to GitHub Pages

## Option 2: Manual Deployment

If you prefer to build and deploy manually:

### 1. Build the Application

```bash
npm install
npm run build
```

This creates a `dist` folder with the built application.

### 2. Create `gh-pages` Branch

```bash
git checkout --orphan gh-pages
git reset --hard
git commit --allow-empty -m "Initial gh-pages commit"
git push origin gh-pages
```

### 3. Deploy Using GitHub Pages Deploy Action

Add a manual deploy script or use a separate workflow for more control.

## Important Configuration

### Update `vite.config.js` for Your Repository

The `base` configuration in `vite.config.js` is crucial for GitHub Pages:

```javascript
// Current setting (for repository named "signal-lab")
base: process.env.NODE_ENV === 'production' ? '/signal-lab/' : '/',

// If your repository has a different name, update accordingly
base: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME/' : '/',

// For user/organization site (github.com/yourusername.github.io)
base: process.env.NODE_ENV === 'production' ? '/' : '/',
```

### Update `.github/workflows/deploy.yml` (Optional)

If you want to use a custom domain:

```yaml
deploy:
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
    cname: yourdomain.com  # Only if you have a custom domain
```

## Troubleshooting

### Site Not Deploying

1. Check GitHub Actions
   - Go to your repository → Actions tab
   - Check the "Deploy to GitHub Pages" workflow
   - Look for error messages in the logs

2. Check Branch Settings
   - Settings → Pages should show "Deployed from GitHub Actions"
   - Not "Deploy from a branch"

3. Clear Cache
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in incognito/private window

### Blank Page or 404 Errors

1. Verify `base` setting in `vite.config.js`
   - Should match your repository name
   - Example: `/signal-lab/` for repo "signal-lab"

2. Check dist folder
   ```bash
   npm run build
   ls -la dist/
   ```
   - Should contain `index.html` and other files

3. Clear Browser Cache
   - Your browser may be caching the old version

### Routes Not Working

1. GitHub Pages doesn't support client-side routing for subfolders
2. The app uses hash-based routing (#) which works on GitHub Pages
3. If you need history-based routing, use a custom domain or different host

## Advanced: Custom Domain

To use a custom domain:

1. **Buy a domain** (GoDaddy, Namecheap, etc.)

2. **Configure DNS**
   - Add CNAME record pointing to `YOUR_USERNAME.github.io`
   - Or add A records as shown in GitHub Pages settings

3. **Update GitHub Pages Settings**
   - Settings → Pages → Custom domain
   - Enter your domain name
   - GitHub will create a `CNAME` file automatically

4. **Update `deploy.yml`**
   ```yaml
   cname: your-custom-domain.com
   ```

5. **Wait for SSL Certificate**
   - GitHub will automatically provision an HTTPS certificate
   - May take a few minutes

## Monitoring Deployments

### View Deployment Status
- Go to your repository
- Click "Environments" tab
- See deployment history and status

### View Workflow Logs
- Click "Actions" tab
- Select "Deploy to GitHub Pages" workflow
- Click the latest run
- Expand logs to see build and deployment details

## Rollback to Previous Version

If something breaks:

1. **View Deployment History**
   - Environments → github-pages → Deployments

2. **Redeploy Previous Version**
   - Find the working commit
   - Push it to main branch
   - Workflow will automatically rebuild and deploy

## Environment Variables

To add environment variables for production:

1. **Create `.env.production` file**
   ```
   VITE_API_URL=https://api.example.com
   VITE_APP_NAME=Signal Lab
   ```

2. **Use in Code**
   ```javascript
   const apiUrl = import.meta.env.VITE_API_URL
   ```

3. **In GitHub Actions**
   - Settings → Secrets and Variables → Actions
   - Add variables
   - Reference in `deploy.yml`:
   ```yaml
   env:
     VITE_API_URL: ${{ secrets.API_URL }}
   ```

## Performance Tips

1. **Use GitHub Pages CDN**
   - Automatically cached and served globally
   - Fast delivery worldwide

2. **Optimize Build**
   - Already configured in `vite.config.js`
   - Tree-shaking and code-splitting enabled

3. **Monitor Build Size**
   ```bash
   npm run build
   du -sh dist/
   ```

## Security

- GitHub Pages serves HTTPS by default ✓
- No sensitive data should be in environment variables ✓
- All data stored locally in browser (no backend) ✓
- No database or server required ✓

## Need Help?

- GitHub Pages Documentation: https://docs.github.com/en/pages
- Vite Documentation: https://vitejs.dev/
- Vue 3 Documentation: https://vuejs.org/
- Report issues: Create a GitHub issue in your repository

---

Happy deploying! 🚀
