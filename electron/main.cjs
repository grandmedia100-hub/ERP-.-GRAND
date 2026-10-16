const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

ipcMain.handle('print-to-pdf', async (event, defaultName = 'document.pdf') => {
    const win = BrowserWindow.fromWebContents(event.sender);
    try {
        const data = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { marginType: 'printableArea' }
        });
        const { filePath } = await dialog.showSaveDialog(win, {
            title: 'Save PDF',
            defaultPath: defaultName,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });
        if (filePath) {
            fs.writeFileSync(filePath, data);
            return { success: true, filePath };
        }
        return { success: false, canceled: true };
    } catch (error) {
        console.error('Failed to print to PDF:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('print-html-to-pdf', async (event, htmlContent, defaultName = 'document.pdf') => {
    const parentWin = BrowserWindow.fromWebContents(event.sender);
    try {
        // Create a hidden window to render the HTML
        const workerWin = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true }
        });
        
        // Load the HTML content
        await workerWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        
        // Wait for images to load if necessary
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const data = await workerWin.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { marginType: 'none' }
        });
        
        workerWin.close();
        
        const { filePath } = await dialog.showSaveDialog(parentWin, {
            title: 'Save PDF',
            defaultPath: defaultName,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });
        if (filePath) {
            fs.writeFileSync(filePath, data);
            return { success: true, filePath };
        }
        return { success: false, canceled: true };
    } catch (error) {
        console.error('Failed to print HTML to PDF:', error);
        return { success: false, error: error.message };
    }
});

function createWindow() {
    const isDev = !app.isPackaged;
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simple migration, though strictly contextIsolation: true is better security
        },
        icon: path.join(__dirname, '../public/icon.ico') // We might need to check if icon exists or use default
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        // mainWindow.webContents.openDevTools();
    } else {
        // In production, load the index.html from the dist folder
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Remove menu bar for a cleaner look (optional)
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
