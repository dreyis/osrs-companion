# Uploading to GitHub

## Browser method
1. Open your repository on GitHub.
2. Click **Add file → Upload files**.
3. Drag everything inside this folder into the upload box.
4. Click **Commit changes**.
5. Go to **Settings → Pages**.
6. Choose **Deploy from a branch**, branch `main`, folder `/root`.
7. Save and wait for GitHub to publish.

## Git command method
From inside this folder:

```bash
git init
git branch -M main
git add .
git commit -m "Initial OSRS Companion PWA"
git remote add origin https://github.com/YOUR_USERNAME/osrs-companion.git
git push -u origin main
```

Then enable Pages from repo Settings.
