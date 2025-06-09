const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    fetchLogs: (cookie, csrfToken, traceId, from, to) => 
        ipcRenderer.invoke('fetchLogs', { cookie, csrfToken, traceId, from, to }),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    closeWindow: () => ipcRenderer.send('close-window')
});