# Signal Lab - Web Version

A modern web-based signal processing and analysis tool built with Vue 3 and Vuetify.

## 🌟 Features

- **Signal Generation**: Create various waveforms
  - Sine waves
  - Cosine waves
  - Square waves
  - Sawtooth waves
  - Triangle waves

- **Signal Analysis**
  - FFT (Fast Fourier Transform) analysis
  - RMS, Peak, and Peak-to-Peak calculations
  - Frequency domain visualization
  - Window functions (Hann window)

- **Signal Tools**
  - Signal comparison and visualization
  - Calculator for signal parameters
  - Frequency, period, and energy calculations
  - Nyquist theorem verification

- **Session Management**
  - Save and manage multiple sessions
  - Store signals within sessions
  - Session notes and metadata

- **Data Management**
  - Export signals as JSON or CSV
  - Import/Export entire sessions
  - Browser-based storage (localStorage)

- **Modern UI**
  - Light and dark themes
  - Responsive design
  - Real-time signal visualization with Chart.js
  - Clean and intuitive interface

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/signal-lab.git
cd signal-lab
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## 🏗️ Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## 🌐 Deployment on GitHub Pages

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Instructions:

1. Fork or create your repository on GitHub
2. Push the code to the main branch
3. Enable GitHub Pages in your repository settings:
   - Go to Settings → Pages
   - Select "GitHub Actions" as the source
4. The workflow will automatically build and deploy on every push to main

The site will be available at: `https://yourusername.github.io/signal-lab/`

To change the base URL, edit `vite.config.js`:
```javascript
base: process.env.NODE_ENV === 'production' ? '/signal-lab/' : '/',
```

## 📁 Project Structure

```
signal-lab-vue/
├── src/
│   ├── components/       # Reusable Vue components
│   ├── views/           # Tab view components
│   ├── stores/          # Pinia state management
│   ├── utils/           # Signal processing utilities
│   ├── assets/          # Static assets
│   ├── App.vue          # Root component
│   └── main.js          # Application entry point
├── public/              # Static files
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Project dependencies
└── .github/workflows/   # GitHub Actions workflows
```

## 📊 Signal Processing

### Supported Waveforms
- **Sine**: `y = A * sin(2πft + φ)`
- **Cosine**: `y = A * cos(2πft + φ)`
- **Square**: Rectangular wave
- **Sawtooth**: Linear ramp wave
- **Triangle**: Triangular wave

### Signal Parameters
- **Frequency**: 0.1 - 100 Hz (adjustable)
- **Amplitude**: 0.1 - 100 (adjustable)
- **Phase**: 0 - 360 degrees (adjustable)
- **Duration**: 0.1 - 10 seconds (adjustable)
- **Sampling Rate**: 100 - 44100 Hz

## 🔧 Technologies

- **Vue 3**: Modern JavaScript framework
- **Vuetify 3**: Material Design component library
- **Vite**: Lightning-fast build tool
- **Chart.js**: Data visualization
- **Pinia**: State management
- **FFT.js**: Signal processing

## 📝 Usage Tips

### Signal Creation
1. Navigate to the "Signal Generator" tab
2. Adjust parameters using sliders or input fields
3. View real-time preview in the time domain
4. Enable FFT for frequency domain analysis
5. Save the signal to your current session

### Analysis
1. Use the "Calculator" tab for quick calculations
2. Compare signals using the "Comparison" tab
3. View signal statistics in real-time

### Session Management
1. Create new sessions to organize signals
2. Add notes to sessions
3. Export data for backup or sharing

## 💾 Data Storage

All data is stored locally in your browser using localStorage:
- Sessions are stored with metadata and notes
- Signals are stored with time and amplitude data
- Settings are remembered between sessions

**Note**: Data is specific to each browser/device. Use the export feature to backup data.

## 🎨 Customization

### Theme Configuration
Edit `src/main.js` to customize colors:
```javascript
colors: {
  primary: '#2563EB',
  secondary: '#64748B',
  // ... more colors
}
```

### Signal Parameters
Adjust default values in `src/views/SignalCreationTab.vue`:
```javascript
const params = ref({
  frequency: 5,      // Default frequency in Hz
  amplitude: 10,     // Default amplitude
  // ... more parameters
})
```

## 🐛 Troubleshooting

### Page not displaying correctly
- Clear browser cache and localStorage
- Check console for errors (F12 → Console)
- Ensure JavaScript is enabled

### Data not saving
- Check browser's localStorage quota
- Try exporting and clearing data
- Use a different browser

### FFT not computing correctly
- Ensure sampling rate ≥ 2 × signal frequency (Nyquist theorem)
- Try enabling window function for better results

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues, feature requests, or questions, please open an issue on GitHub.

## 🙏 Acknowledgments

- Vue 3 and Vuetify teams for excellent frameworks
- Chart.js for visualization
- Original Signal Lab Python version for inspiration

---

Built with ❤️ using Vue 3 and Vuetify
