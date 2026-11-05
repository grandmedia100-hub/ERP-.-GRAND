const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { fork } = require("child_process");
const http = require("http");

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 4000;

// Resolve paths depending on packaged state
const isPackaged = app.isPackaged;
const serverDir = isPackaged
    ? path.join(process.resourcesPath, "server")
    : path.join(__dirname, "..", "server");

const serverScript = path.join(serverDir, "server.js");

// User data directory for database and persistent backups
const dataDir = isPackaged
    ? path.join(app.getPath("userData"), "data")
    : serverDir;

const distDir = isPackaged
    ? path.join(__dirname, "..", "dist")
    : path.join(__dirname, "..", "dist");

function ensureDatabaseInitialized() {
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const targetDb = path.join(dataDir, "mediahive-clean.db");
        const templateDb = path.join(serverDir, "mediahive-clean.db");
        if (isPackaged && !fs.existsSync(targetDb) && fs.existsSync(templateDb)) {
            fs.copyFileSync(templateDb, targetDb);
            console.log("[Electron] Initialized database in userData directory.");
        }
    } catch (e) {
        console.error("[Electron] Error initializing database directory:", e);
    }
}

function startServer() {
    return new Promise((resolve) => {
        ensureDatabaseInitialized();

        const env = {
            ...process.env,
            PORT: String(SERVER_PORT),
            ELECTRON: "1",
            ELECTRON_RUN_AS_NODE: "1",
            MEDIAHIVE_DATA_DIR: dataDir,
            DIST_PATH: distDir
        };

        try {
            serverProcess = fork(serverScript, [], {
                cwd: serverDir,
                env,
                silent: true
            });

            if (serverProcess.stdout) {
                serverProcess.stdout.on("data", (data) => {
                    console.log("[Server]", data.toString().trim());
                });
            }

            if (serverProcess.stderr) {
                serverProcess.stderr.on("data", (data) => {
                    console.error("[Server Error]", data.toString().trim());
                });
            }

            serverProcess.on("error", (err) => {
                console.error("[Server Process Error]", err);
            });
        } catch (err) {
            console.error("[Server Fork Error]", err);
        }

        // Wait for server health endpoint to be ready
        let attempts = 0;
        const maxAttempts = 40; // 8 seconds max
        const checkHealth = () => {
            attempts++;
            const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/health`, (res) => {
                if (res.statusCode === 200) {
                    console.log("[Electron] Backend server is healthy and responding.");
                    return resolve(true);
                }
                retry();
            });
            req.on("error", () => {
                retry();
            });
        };

        const retry = () => {
            if (attempts >= maxAttempts) {
                console.warn("[Electron] Server health check timed out, proceeding anyway.");
                return resolve(false);
            }
            setTimeout(checkHealth, 200);
        };

        setTimeout(checkHealth, 300);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: "MediaHive ERP",
        icon: path.join(__dirname, "icon.png"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        show: false
    });

    const appUrl = `http://localhost:${SERVER_PORT}`;
    mainWindow.loadURL(appUrl);

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    // Open external web links in system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });
}

function cleanupServer() {
    if (serverProcess) {
        try {
            serverProcess.kill();
        } catch (e) {}
        serverProcess = null;
    }
}

app.whenReady().then(async () => {
    await startServer();
    createWindow();
});

app.on("window-all-closed", () => {
    cleanupServer();
    app.quit();
});

app.on("before-quit", () => {
    cleanupServer();
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
