const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const chokidar = require('chokidar');
require('dotenv').config();

const YOUR_ACCESS_KEY = process.env.YOUR_ACCESS_KEY;
const YOUR_SECRET_KEY = process.env.YOUR_SECRET_KEY;
const YOUR_BUCKET_REGION = process.env.YOUR_BUCKET_REGION;
const YOUR_BUCKET_NAME = process.env.YOUR_BUCKET_NAME;

const s3Client = new S3Client({
  region: YOUR_BUCKET_REGION,
  credentials: {
    accessKeyId: YOUR_ACCESS_KEY,
    secretAccessKey: YOUR_SECRET_KEY,
  },
});

const WATCH_FOLDER = path.join(app.getPath('documents'), 'Foto-Owl');
fs.mkdirSync(WATCH_FOLDER, { recursive: true });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  startWatchingFolder();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('upload-files', async (event, files) => {
  await uploadFiles(event, files);
});

ipcMain.on('sync-folder', async (event) => {
  const files = listFilesInFolder(WATCH_FOLDER);
  await uploadFiles(event, files);
});

async function uploadFiles(event, files) {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  let uploadedSize = 0;
  let demSize = 0;

  async function uploadFile(file) {
    const fileContent = fs.readFileSync(file.path);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: YOUR_BUCKET_NAME,
        Key: file.relativePath || file.name,
        Body: fileContent,
      },
    });
    upload.on('httpUploadProgress', (progress) => {
      uploadedSize = uploadedSize + (progress.loaded - demSize);
      demSize = progress.loaded;
      const progressPercentage = Math.round((uploadedSize / totalSize) * 100);
      const progressData = {
        file: file.name,
        progress: progressPercentage,
      };
      if (event.reply) {
        event.reply('upload-progress', progressData);
      } else {
        mainWindow.webContents.send('upload-progress', progressData);
      }
    });
    return upload.done();
  }

  
  for (const file of files) {
    try {
      await uploadFile(file);
      const statusData = { status: 'success', message: `Successfully uploaded: ${file.name}` };
      if (event.reply) {
        event.reply('upload-status', statusData);
      } else {
        mainWindow.webContents.send('upload-status', statusData);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      const statusData = { status: 'error', message: `Error uploading file: ${file.name}` };

      if (event.reply) {
        event.reply('upload-status', statusData);
      } else {
        mainWindow.webContents.send('upload-status', statusData);
      }
    }
  }

  if (event.reply) {
    event.reply('upload-complete');
  } else {
    mainWindow.webContents.send('upload-complete');
  }

  new Notification({
    title: 'Upload Complete',
    body: 'All files have been successfully uploaded.',
  }).show();
}

function startWatchingFolder() {
  const watcher = chokidar.watch(WATCH_FOLDER, {
    ignored: /^\./,
    persistent: true,
  });

  watcher.on('add', async (filePath) => {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    const relativePath = path.relative(WATCH_FOLDER, filePath);

    const file = { path: filePath, name: fileName, size: fileSize, relativePath };
    await uploadFiles(null, [file]);
  });
}

function listFilesInFolder(folderPath) {
  const fileList = [];

  function readDirRecursive(directory) {
    const files = fs.readdirSync(directory);
    files.forEach((file) => {
      const fullPath = path.join(directory, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        readDirRecursive(fullPath);
      } else {
        fileList.push({
          path: fullPath,
          name: path.basename(fullPath),
          size: stats.size,
          relativePath: path.relative(WATCH_FOLDER, fullPath),
        });
      }
    });
  }

  readDirRecursive(folderPath);
  return fileList;
}
