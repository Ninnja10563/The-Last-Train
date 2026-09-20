const { app, BrowserWindow, Menu, protocol, net, session, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { assetPath } = require('./paths.cjs');

app.setName('The Last Train');
if (process.env.LAST_TRAIN_USER_DATA) app.setPath('userData', process.env.LAST_TRAIN_USER_DATA);
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
const home = 'app://game/';
let mainWindow;
async function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'THE LAST TRAIN',
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#101613',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== home && url !== home + 'index.html') event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  try {
    await mainWindow.loadURL(home);
  } catch (error) {
    dialog.showErrorBox('The Last Train could not start', error.message);
    app.quit();
  }
}
app.whenReady().then(async () => {
  const root = path.join(app.getAppPath(), 'dist');
  protocol.handle('app', async (request) => {
    try {
      const file = assetPath(request.url, root);
      if (!file || request.method !== 'GET') return new Response('Not found', { status: 404 });
      const response = await net.fetch(pathToFileURL(file).toString());
      const headers = new Headers(response.headers);
      headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self' https: http:; object-src 'none'; base-uri 'none'; frame-src 'none'",
      );
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(
      contents?.getURL().startsWith(home) && ['pointerLock', 'fullscreen'].includes(permission),
    );
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission, origin) => {
    return Boolean(
      contents?.getURL().startsWith(home) &&
      origin === 'app://game' &&
      ['pointerLock', 'fullscreen'].includes(permission),
    );
  });
  const menu = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: 'The Last Train',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    { label: 'File', submenu: [{ role: process.platform === 'darwin' ? 'close' : 'quit' }] },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
  await createWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
