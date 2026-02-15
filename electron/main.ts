import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

// ============================================
// AUTO-UPDATE CONFIGURATION
// ============================================

// Configure auto-updater
autoUpdater.autoDownload = false // Don't download automatically, ask user first
autoUpdater.autoInstallOnAppQuit = true // Install on quit

// Auto-update event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...')
  if (win) {
    win.webContents.send('update-checking')
  }
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version)
  // Send to renderer for UI display
  if (win) {
    win.webContents.send('update-available', info.version)
  }
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available. Would you like to download it now?`,
    buttons: ['Download', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate()
    }
  })
})

autoUpdater.on('update-not-available', () => {
  console.log('No updates available.')
  if (win) {
    win.webContents.send('update-not-available')
  }
})

autoUpdater.on('download-progress', (progressObj) => {
  let message = `Download speed: ${progressObj.bytesPerSecond}`
  message += ` - Downloaded ${progressObj.percent.toFixed(2)}%`
  message += ` (${progressObj.transferred}/${progressObj.total})`
  console.log(message)
  
  // Send progress to renderer if needed
  if (win) {
    win.webContents.send('update-download-progress', progressObj.percent)
  }
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version)
  // Send to renderer for UI display
  if (win) {
    win.webContents.send('update-downloaded', info.version)
  }
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded. Restart now to install the update?`,
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })
})

autoUpdater.on('error', (error) => {
  console.error('Auto-update error:', error)
  if (win) {
    win.webContents.send('update-error', error.message)
  }
})

// ============================================
// WINDOW CREATION
// ============================================

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  
  // Check for updates after app is ready (only in production)
  if (!VITE_DEV_SERVER_URL) {
    // Wait a bit before checking for updates to not slow down startup
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 3000)
  }
})

// ============================================
// SILENT PRINT HANDLER
// ============================================

ipcMain.handle('silent-print', async (_event, html: string) => {
  return new Promise((resolve, reject) => {
    // Set width to ~302px (80mm at 96dpi) to match receipt CSS
    const printWindow = new BrowserWindow({
      show: false,
      width: 302,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    })

    // Load the HTML content
    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    printWindow.webContents.on('did-finish-load', () => {
      // Print silently to default printer with thermal receipt paper size
      printWindow.webContents.print(
        { 
          silent: true, 
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize: { width: 80000, height: 297000 } // 80mm width in microns
        },
        (success, errorType) => {
          printWindow.close()
          if (success) {
            resolve({ success: true })
          } else {
            reject({ success: false, error: errorType })
          }
        }
      )
    })

    printWindow.webContents.on('did-fail-load', () => {
      printWindow.close()
      reject({ success: false, error: 'Failed to load print content' })
    })
  })
})
