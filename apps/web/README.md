# FocusButton Web App

The web version of FocusButton, providing a clean and intuitive Pomodoro timer interface accessible from any browser.

## Features

- 🎯 Simple, distraction-free interface
- ⏱️ Customizable focus session durations
- 🔔 Browser notifications
- 🎵 Audio notifications
- 🌓 Dark mode support
- 💾 Local storage for settings
- 📱 Responsive design for all devices
- ⚡ Built with Next.js 14

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

3. Start the development server:
```bash
cd apps/web
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

### Project Structure

```
apps/web/
├── app/                # Next.js app directory
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Home page
│   └── globals.scss   # Global styles
├── components/        # React components
├── public/           # Static assets
└── styles/          # Component styles
```

### Technologies Used

- [Next.js 14](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

### Building for Production

```bash
npm run build
```

The built app will be in the `.next` folder.

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

- 🐛 [Report bugs](https://github.com/ibsukru/focusbutton/issues)
- 💡 [Request features](https://github.com/ibsukru/focusbutton/issues)
- 📖 [Read documentation](https://github.com/ibsukru/focusbutton/wiki)
