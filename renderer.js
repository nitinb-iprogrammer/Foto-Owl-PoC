const { ipcRenderer } = require('electron');

const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');
const syncButton = document.getElementById('syncButton'); // New Sync button
const uploadHistoryDiv = document.getElementById('uploadHistory');
const totalProgressPercentage = document.getElementById('totalProgressPercentage');
const totalProgressBarInner = document.getElementById('totalProgressBarInner');
const countFilesUploaded = document.getElementById('countFilesUploaded');

let totalFiles = 0;
let uploadedFilesCount = 0;
let totalUploadedSize = 0;
let totalSize = 0;

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    uploadButton.disabled = false;
    totalFiles = fileInput.files.length;
    countFilesUploaded.textContent = `Files Uploaded: 0 / ${totalFiles}`;
  } else {
    uploadButton.disabled = true;
    totalFiles = 0;
    countFilesUploaded.textContent = `Files Uploaded: 0 / 0`;
  }
});

uploadButton.addEventListener('click', () => {
  const files = Array.from(fileInput.files);
  uploadButton.disabled = true;  // Disable upload button
  totalFiles = files.length;
  uploadedFilesCount = 0;
  totalUploadedSize = 0;
  totalSize = files.reduce((acc, file) => acc + file.size, 0);
  countFilesUploaded.textContent = `Files Uploaded: 0 / ${totalFiles}`;
  ipcRenderer.send('upload-files', files.map(file => ({
    path: file.path,
    name: file.name,
    size: file.size
  })));
});

syncButton.addEventListener('click', () => {
  ipcRenderer.send('sync-folder');  // Send sync-folder event to main process
});

ipcRenderer.on('upload-status', (event, { status, message }) => {
  console.log("status, message--------",status, message)
  const statusDiv = document.getElementById('status');
  const statusMessage = document.createElement('p');
  statusMessage.textContent = message;
  // statusDiv.appendChild(statusMessage);

  // Add to history
  const historyMessage = document.createElement('p');
  historyMessage.textContent = message;
  uploadHistoryDiv.appendChild(historyMessage);

  if (status === 'success') {
    uploadedFilesCount = uploadedFilesCount + 1;
    countFilesUploaded.textContent = `Files Uploaded: ${uploadedFilesCount} / ${totalFiles}`;
  }
});

ipcRenderer.on('upload-progress', (event, { file, progress, remainingTime }) => {
  const progressBar = document.getElementById('progressBar');
  progressBar.value = progress;
});

ipcRenderer.on('upload-complete', () => {
  uploadButton.disabled = false;  // Enable upload button
  const timeEstimationDiv = document.getElementById('timeEstimation');
  timeEstimationDiv.textContent = 'All uploads complete!';
});
