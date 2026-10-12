
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  listClients: () => ipcRenderer.invoke("clients:list"),
  createClient: (data) => ipcRenderer.invoke("clients:create", data),

  listProjects: () => ipcRenderer.invoke("projects:list"),
  createProject: (data) => ipcRenderer.invoke("projects:create", data),

  listPayments: () => ipcRenderer.invoke("payments:list"),
  createPaymentObligation: (data) =>
    ipcRenderer.invoke("payments:create-obligation", data),
  recordPaymentReceipt: (data) =>
    ipcRenderer.invoke("payments:record-receipt", data),
  listPaymentHistory: () => ipcRenderer.invoke("payments:history")
});
