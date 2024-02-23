const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  selectPDF: () => ipcRenderer.send('select-pdf'),
  onProgressUpdate: (callback) => {
    ipcRenderer.on('progress-update', (event, progress) => callback(progress));
  }
})
