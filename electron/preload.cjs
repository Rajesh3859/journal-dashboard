
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  listClients: () => ipcRenderer.invoke("clients:list"),
  createClient: (data) => ipcRenderer.invoke("clients:create", data),

  listProjects: () => ipcRenderer.invoke("projects:list"),
  createProject: (data) => ipcRenderer.invoke("projects:create", data),
  updateProject: (data) => ipcRenderer.invoke("projects:update", data),
  updateProjectStatus: (id, status) =>
    ipcRenderer.invoke("projects:update-status", { id, status }),
  updateProjectCategory: (id, workType) =>
    ipcRenderer.invoke("projects:update-category", { id, workType }),
  deleteProject: (id) => ipcRenderer.invoke("projects:delete", id),
  updateProjectAuthors: (id, authors) =>
    ipcRenderer.invoke("projects:update-authors", { id, authors }),

  listPayments: () => ipcRenderer.invoke("payments:list"),
  createPaymentObligation: (data) =>
    ipcRenderer.invoke("payments:create-obligation", data),
  recordPaymentReceipt: (data) =>
    ipcRenderer.invoke("payments:record-receipt", data),
  listPaymentHistory: () => ipcRenderer.invoke("payments:history"),

  // Backup & Restore
  selectBackupDirectory: () => ipcRenderer.invoke("backup:choose-directory"),
  getBackupSettings: () => ipcRenderer.invoke("backup:get-settings"),
  saveBackupSettings: (data) => ipcRenderer.invoke("backup:save-settings", data),
  createBackupNow: (data) => ipcRenderer.invoke("backup:create-now", data),
  exportStandaloneBackup: () => ipcRenderer.invoke("backup:export-standalone"),
  listBackupFiles: () => ipcRenderer.invoke("backup:list-files"),
  selectRestoreFile: () => ipcRenderer.invoke("backup:select-restore-file"),
  restoreBackup: (data) => ipcRenderer.invoke("backup:restore", data),
  openBackupFolder: (path) => ipcRenderer.invoke("backup:open-folder", path),
  onAutoBackupCompleted: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("backup:auto-completed", handler);
    return () => ipcRenderer.removeListener("backup:auto-completed", handler);
  }
});
