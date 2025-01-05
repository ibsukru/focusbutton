const { app, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

let tray;

app.dock.hide(); // Hide from dock since it's a menu bar app

app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  tray.setTitle('FocusButton');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Focus Mode', type: 'checkbox', checked: store.get('focusMode', false), click: () => {
      const currentState = store.get('focusMode', false);
      store.set('focusMode', !currentState);
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
