const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
require('dotenv').config();

const YOUR_ACCESS_KEY = process.env.YOUR_ACCESS_KEY || "AKIAXHMBFFIMICSUQG6S";
const YOUR_SECRET_KEY = process.env.YOUR_SECRET_KEY || "dj2Z9pqhMYWAIwYphKaTz95IcfMFxMBqw2TEwiDv";
const YOUR_BUCKET_REGION = process.env.YOUR_BUCKET_REGION || "ap-south-1";
const YOUR_BUCKET_NAME = process.env.YOUR_BUCKET_NAME || "test-electronjs";

const s3Client = new S3Client({
  region: YOUR_BUCKET_REGION,
  credentials: {
    accessKeyId: YOUR_ACCESS_KEY,
    secretAccessKey: YOUR_SECRET_KEY,
  },
});

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('upload-files', async (event, files) => {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  let uploadedSize = 0;
  const startTime = Date.now();

  async function uploadFile(file) {
    const fileContent = fs.readFileSync(file.path);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: YOUR_BUCKET_NAME,
        Key: file.name,
        Body: fileContent,
      },
    });

    upload.on('httpUploadProgress', (progress) => {
      const progressPercentage = Math.round((progress.loaded / progress.total) * 100);
      const elapsedTime = (Date.now() - startTime) / 1000; // seconds
      uploadedSize += progress.loaded;
      const estimatedTotalTime = (elapsedTime / uploadedSize) * totalSize; // seconds
      const remainingTime = estimatedTotalTime - elapsedTime; // seconds

      event.reply('upload-progress', {
        file: file.name,
        progress: progressPercentage,
        remainingTime: Math.round(remainingTime),
      });
    });

    return upload.done();
  }

  (async function uploadFilesSequentially(files) {
    for (const file of files) {
      try {
        await uploadFile(file);
        event.reply('upload-status', { status: 'success', message: `Successfully uploaded: ${file.name}` });
      } catch (err) {
        console.error('Error uploading file:', err);
        event.reply('upload-status', { status: 'error', message: `Error uploading file: ${file.name}` });
      }
    }
    event.reply('upload-complete');

    // Show notification
    new Notification({
      title: 'Upload Complete',
      body: 'All files have been successfully uploaded.',
    }).show();
  })(files);
});
