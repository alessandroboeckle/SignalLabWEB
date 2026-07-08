# Signal Lab - Quick Start Guide

## 🎯 5-Minute Setup

### 1. Clone/Download the Project
```bash
git clone https://github.com/YOUR_USERNAME/signal-lab.git
cd signal-lab
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Your app will open at `http://localhost:3000` automatically!

## 📱 First Use

### Generate Your First Signal
1. Go to the "Signal Generator" tab
2. Adjust the frequency slider to 10 Hz
3. Amplitude to 5
4. Watch the live preview update in real-time
5. Click "Save Signal" to store it

### Try FFT Analysis
1. Enable "Enable FFT Analysis" checkbox
2. See the frequency spectrum appear
3. Try applying Hann Window for better results
4. Adjust frequency and see spectrum change

### Create a Session
1. Go to "Sessions" tab
2. Click "New Session"
3. Name it "My Signals"
4. Save multiple signals to this session

## 🚀 Deploy to GitHub Pages (2 minutes)

### Step 1: Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/signal-lab.git
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. Go to your repo on GitHub
2. Settings → Pages
3. Select "GitHub Actions" as source
4. Done! Your site deploys automatically

Your live site: `https://YOUR_USERNAME.github.io/signal-lab/`

## 🔧 Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# All dependencies are pre-configured
# No additional setup needed!
```

## 📊 Features at a Glance

| Tab | Purpose |
|-----|---------|
| **Overview** | Dashboard with recent signals and statistics |
| **Signal Generator** | Create and analyze signals with real-time preview |
| **Calculator** | Quick calculations for signal parameters |
| **Comparison** | Compare multiple signals side-by-side |
| **Sessions** | Organize and manage your work |
| **Settings** | Customize appearance and preferences |

## 🎨 Customize Your Setup

### Change Repository Name
If you named your repo differently, update `vite.config.js`:
```javascript
// Change 'signal-lab' to your repo name
base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/',
```

### Change Theme Colors
Edit `src/main.js`:
```javascript
colors: {
  primary: '#2563EB',      // Change this blue
  secondary: '#64748B',
  // ... more options
}
```

### Default Signal Parameters
Edit `src/views/SignalCreationTab.vue`:
```javascript
const params = ref({
  frequency: 5,      // Default Hz
  amplitude: 10,     // Default amplitude
  // ... more settings
})
```

## 📚 Project Structure

```
signal-lab/
├── src/
│   ├── views/           ← Tab components (main files to edit)
│   ├── utils/           ← Signal processing logic
│   ├── stores/          ← App state management
│   ├── App.vue          ← Root component
│   └── main.js          ← App config
├── dist/                ← Built app (created by npm run build)
├── package.json         ← Dependencies
├── vite.config.js       ← Build config
├── index.html           ← HTML template
└── README.md            ← Full documentation
```

## 💡 Tips & Tricks

### Keyboard Shortcuts
- `Ctrl+S` / `Cmd+S` - Save signal
- `Ctrl+E` / `Cmd+E` - Export signal
- `Ctrl+N` / `Cmd+N` - New session

### Performance
- Use "Sample Rate" of 1000-5000 Hz for most applications
- Higher sample rates use more memory
- FFT works best with power-of-2 sample counts (1024, 2048, 4096)

### Storage
- Data saved in browser's localStorage
- Limited to ~5MB per site
- Export regularly for backup

### Dark Mode
- Automatically respects system preference
- Toggle in settings menu
- Theme persists between sessions

## 🐛 Common Issues & Solutions

### "Port 3000 already in use"
```bash
# Use a different port
npm run dev -- --port 3001
```

### Charts not showing
```bash
# Clear browser cache
# Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
# Try in private/incognito window
```

### Build fails
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### GitHub Pages showing blank page
1. Check `base` path in `vite.config.js`
2. Repository name must match the path
3. Wait 2-3 minutes for deployment
4. Hard refresh browser (Ctrl+Shift+R)

## 📖 Learn More

- **Full Documentation**: See `README.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Vue.js Basics**: https://vuejs.org/guide/
- **Vuetify Components**: https://vuetifyjs.com/
- **Signal Processing**: https://en.wikipedia.org/wiki/Signal_processing

## 🤝 Getting Help

1. **Check existing issues**: GitHub Issues tab
2. **Console errors**: Open DevTools (F12) and check Console
3. **Read documentation**: README.md and DEPLOYMENT.md
4. **Ask questions**: Create a GitHub Discussion

## ✨ Next Steps

1. ✅ Run `npm install`
2. ✅ Run `npm run dev`
3. ✅ Play with signals
4. ✅ Generate some data
5. ✅ Deploy to GitHub Pages
6. ✅ Share your link!

---

**Enjoy Signal Lab!** 🎉

Need help? Check the full README.md for detailed documentation.
