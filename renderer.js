const { ipcRenderer } = require('electron');

const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');
const syncButton = document.getElementById('syncButton'); // New Sync button

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    uploadButton.disabled = false;
  } else {
    uploadButton.disabled = true;
  }
});

uploadButton.addEventListener('click', () => {
  const files = Array.from(fileInput.files);
  uploadButton.disabled = true;  // Disable upload button
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
  const statusDiv = document.getElementById('status');
  const statusMessage = document.createElement('p');
  statusMessage.textContent = message;
  statusDiv.appendChild(statusMessage);
});

ipcRenderer.on('upload-progress', (event, { file, progress, remainingTime }) => {
  let progressBar = document.getElementById(`progress-${file}`);
  if (!progressBar) {
    const progressContainer = document.getElementById('progressContainer');
    const progressDiv = document.createElement('div');
    progressDiv.id = `progress-${file}`;
    progressDiv.style.marginBottom = '10px';

    const progressLabel = document.createElement('span');
    progressLabel.textContent = `${file}: ${progress}%`;
    progressLabel.id = `progress-label-${file}`;

    const progressBarOuter = document.createElement('div');
    progressBarOuter.style.width = '100%';
    progressBarOuter.style.backgroundColor = '#ccc';
    progressBarOuter.style.height = '20px';

    const progressBarInner = document.createElement('div');
    progressBarInner.style.height = '20px';
    progressBarInner.style.width = `${progress}%`;
    progressBarInner.style.backgroundColor = '#4caf50';
    progressBarInner.id = `progress-bar-inner-${file}`;

    progressBarOuter.appendChild(progressBarInner);
    progressDiv.appendChild(progressLabel);
    progressDiv.appendChild(progressBarOuter);
    progressContainer.appendChild(progressDiv);
  } else {
    const progressBarInner = document.getElementById(`progress-bar-inner-${file}`);
    progressBarInner.style.width = `${progress}%`;
    const progressLabel = document.getElementById(`progress-label-${file}`);
    progressLabel.textContent = `${file}: ${progress}%`;
  }

  const timeEstimationDiv = document.getElementById('timeEstimation');
  if (remainingTime >= 0) {
    timeEstimationDiv.textContent = `Estimated time remaining: ${remainingTime} seconds`;
  } else {
    timeEstimationDiv.textContent = 'Calculating time estimation...';
  }
});

ipcRenderer.on('upload-complete', () => {
  uploadButton.disabled = false;  // Enable upload button
  const timeEstimationDiv = document.getElementById('timeEstimation');
  timeEstimationDiv.textContent = 'All uploads complete!';
});
