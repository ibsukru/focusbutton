# FocusButton Browser Extension

A minimalist Pomodoro timer extension for Chrome and Firefox that helps users maintain productivity through focused work sessions.

## Features

- 🎯 Simple, distraction-free interface
- ⏱️ Customizable focus session durations
- 🔔 Desktop notifications for session completion
- 🎵 Audio notifications with custom sounds
- 🌓 Dark mode support
- 💾 Local storage for settings
- 🔄 Cross-device synchronization
- 🌐 Cross-browser support (Chrome & Firefox)

## API Usage Justifications

### 1. Offscreen API

Used exclusively for audio playback to notify users when focus sessions end.

**Justification:**

- Essential for user awareness when working in other tabs/applications
- Crucial for accessibility (users with visual impairments)
- Prevents users from unknowingly exceeding focus duration
- Minimal resource usage (created only when needed)
- Properly cleaned up after use
- No sensitive data processing
- Audio files bundled with extension

**Implementation:**

```javascript
chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["AUDIO_PLAYBACK"],
  justification: "Playing timer completion sound",
});
```

### 2. Storage API

Used for storing timer state and user preferences.

**Justification:**

- Essential for maintaining timer state across sessions
- Required for syncing preferences across devices
- Stores only necessary data locally
- No sensitive information stored
- Implements proper data cleanup

### 3. Alarms API

Used for accurate timer functionality.

**Justification:**

- Required for reliable timer operation
- More efficient than setInterval/setTimeout
- Handles background operation correctly
- Minimal system resource usage
- Essential for core extension functionality

### 4. Notifications API

Used for timer completion alerts.

**Justification:**

- Essential for user awareness
- Respects system notification settings
- Used only for important timer events
- Enhances accessibility
- No marketing or promotional content

### 5. Tabs API

Used for managing timer state across browser tabs and windows.

**Justification:**

- Essential for synchronizing timer state across multiple tabs
- Required for consistent timer display in all extension instances
- Needed for proper background worker communication
- Used to maintain accurate timer state when switching tabs
- No access to tab content or browsing history
- Only used for extension's own UI updates
- Ensures seamless user experience across browser sessions

## Installation

### From Source

1. Clone the repository:

```bash
git clone https://github.com/ibsukru/focusbutton.git
cd focusbutton
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
cd apps/extension
npm run build
```

4. Load in your browser:

#### Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder in `apps/extension`

#### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `dist` folder in `apps/extension`

## Development

### Prerequisites

- Node.js 16.x or later

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Load the extension in your browser (see Installation steps above)

### Building for Production

```bash
npm run build
```

The built extension will be in the `dist` folder.

## Privacy Policy

FocusButton respects your privacy:

- No data collection or tracking
- All data stored locally
- No external services used

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

- 🐛 [Report bugs](https://github.com/ibsukru/focusbutton/issues)
- 💡 [Request features](https://github.com/ibsukru/focusbutton/issues)
- 📖 [Read documentation](https://github.com/ibsukru/focusbutton/wiki)
