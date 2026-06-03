# Deploying SeferScroll to Vercel — Step by Step

This guide assumes you're brand new to this. Every step is explained.

---

## What you'll need

- A computer with internet access
- About 20 minutes
- No coding experience required — just follow the steps

---

## Step 1: Create a GitHub account (if you don't have one)

1. Go to https://github.com
2. Click **Sign up**
3. Follow the prompts to create your free account
4. Verify your email address

---

## Step 2: Install Node.js

Node.js is what runs JavaScript on your computer. You need it to build the project.

1. Go to https://nodejs.org
2. Download the **LTS** version (the big green button on the left)
3. Run the installer — just click "Next" through everything, the defaults are fine
4. To verify it worked, open **Terminal** (Mac) or **Command Prompt** (Windows) and type:
   ```
   node --version
   ```
   You should see something like `v20.x.x`

---

## Step 3: Install Git

Git is the tool that uploads your code to GitHub.

**Mac:** Open Terminal and type:
```
git --version
```
If it's not installed, your Mac will prompt you to install it. Say yes.

**Windows:** Download from https://git-scm.com/download/win and run the installer (defaults are fine).

---

## Step 4: Get the SeferScroll project files onto your computer

You should have downloaded the project folder from our chat. If you have the ZIP:

1. Unzip/extract the folder somewhere you'll remember (like your Desktop or Documents)
2. You should see a folder called `seferscroll` with files like `package.json`, `index.html`, `src/`, etc.

---

## Step 5: Install the project dependencies

1. Open **Terminal** (Mac) or **Command Prompt** (Windows)
2. Navigate to the seferscroll folder. For example:
   ```
   cd ~/Desktop/seferscroll
   ```
   (Replace the path with wherever you put the folder)
3. Run:
   ```
   npm install
   ```
   This downloads all the libraries the project needs. It might take a minute.

---

## Step 6: Test it locally (optional but recommended)

While still in the seferscroll folder in Terminal, run:
```
npm run dev
```

Open your browser and go to http://localhost:5173

You should see SeferScroll working with live data from Sefaria! If it works, press `Ctrl+C` in the terminal to stop the server.

---

## Step 7: Create a GitHub repository

1. Go to https://github.com and make sure you're signed in
2. Click the **+** button in the top right → **New repository**
3. Name it `seferscroll`
4. Leave it as **Public**
5. Do NOT check "Add a README" (we already have one)
6. Click **Create repository**
7. You'll see a page with instructions — keep this tab open

---

## Step 8: Push your code to GitHub

In your Terminal (still in the seferscroll folder), run these commands one at a time:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit - SeferScroll"
```

```bash
git branch -M main
```

Now connect it to GitHub (replace YOUR_USERNAME with your actual GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/seferscroll.git
```

```bash
git push -u origin main
```

It may ask for your GitHub username and password. For the password, you'll need a **Personal Access Token**:
1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Give it a name like "seferscroll deploy"
4. Check the **repo** checkbox
5. Click **Generate token**
6. Copy the token and use it as your password

---

## Step 9: Deploy on Vercel

1. Go to https://vercel.com
2. Click **Sign Up** → choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Once logged in, click **Add New...** → **Project**
5. You'll see your GitHub repositories — find **seferscroll** and click **Import**
6. Vercel will auto-detect that it's a Vite project. The settings should be:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
7. Click **Deploy**
8. Wait about 30-60 seconds for it to build

---

## Step 10: You're live!

Vercel will give you a URL like `seferscroll.vercel.app` (or similar). That's your live site! 

You can also set up a custom domain later in Vercel's dashboard under **Settings → Domains**.

---

## Making changes later

Whenever you want to update the site:

1. Edit the files on your computer
2. In Terminal, in the seferscroll folder:
   ```bash
   git add .
   git commit -m "Description of what you changed"
   git push
   ```
3. Vercel automatically rebuilds and redeploys within about a minute

---

## Troubleshooting

**"npm: command not found"**
→ Node.js isn't installed or isn't in your PATH. Restart your Terminal after installing Node.js.

**"git: command not found"**  
→ Git isn't installed. See Step 3.

**Build fails on Vercel**
→ Make sure `npm run build` works locally first (it creates a `dist` folder).

**Sefaria API not loading**
→ The site will show sample verses as a fallback. The Sefaria API is free and doesn't require a key, but occasionally may be slow. The live site should work perfectly since there are no sandbox restrictions.

**Want to change the name or URL?**
→ In Vercel dashboard, go to Settings → Domains to add a custom domain, or Settings → General to rename the project.

---

## Questions?

- Sefaria API docs: https://developers.sefaria.org
- Vercel docs: https://vercel.com/docs
- Vite docs: https://vitejs.dev
