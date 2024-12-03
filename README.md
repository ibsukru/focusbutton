# FocusButton

<div align="center">
  <img src="apps/extension/public/icons/icon-128.png" alt="FocusButton Logo" width="128" height="128">
  <h3>Stay focused and productive with FocusButton</h3>
</div>

FocusButton is an open-source browser extension and web app that helps you stay focused and productive using the Pomodoro Technique. It features a clean interface, customizable timers, and cross-browser support.

## Features

- 🎯 Simple and intuitive Pomodoro timer
- 🔔 Desktop notifications when timer completes
- 🎵 Customizable sound alerts
- 🌐 Cross-browser support (Chrome & Firefox)
- 💻 Web app version available
- 🎨 Clean, modern interface
- ⚡ Built with performance in mind

## Getting Started

### Prerequisites

- Node.js 16.x or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ibsukru/focusbutton.git
cd focusbutton
```

2. Install dependencies:
```bash
npm install
```

3. Build all packages:
```bash
npm run build
```

### Development

To start development servers for all apps:
```bash
npm run dev
```

#### Browser Extension Development

The extension is located in `apps/extension`. To load it in your browser:

1. Build the extension:
```bash
cd apps/extension
npm run build
```

2. Load the extension:
- Chrome: Go to `chrome://extensions/`, enable Developer mode, click "Load unpacked", select the `dist` folder
- Firefox: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select any file in the `dist` folder

#### Web App Development

The web app is located in `apps/web`. To run it locally:
```bash
cd apps/web
npm run dev
```

## Project Structure

- `apps/`
  - `extension/` - Browser extension
  - `web/` - Next.js web app
- `packages/`
  - `ui/` - Shared React components
  - `eslint-config/` - ESLint configurations
  - `typescript-config/` - TypeScript configurations

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Turborepo](https://turbo.build/repo)
- UI components powered by [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

## Support

- 🌟 Star this repo
- 🐛 [Report bugs](https://github.com/ibsukru/focusbutton/issues)
- 💡 [Request features](https://github.com/ibsukru/focusbutton/issues)
- 📖 [Read our docs](https://github.com/ibsukru/focusbutton/wiki)
