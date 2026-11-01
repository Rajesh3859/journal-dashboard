
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
  },

  // Research Paper Trading Dashboard API
  trading: {
    listPurchases: () => ipcRenderer.invoke("trading:purchases:list"),
    createPurchase: (data) => ipcRenderer.invoke("trading:purchases:create", data),
    updatePurchase: (data) => ipcRenderer.invoke("trading:purchases:update", data),
    deletePurchase: (id) => ipcRenderer.invoke("trading:purchases:delete", id),

    listSellerPayments: (purchaseId) => ipcRenderer.invoke("trading:seller-payments:list", purchaseId),
    createSellerPayment: (data) => ipcRenderer.invoke("trading:seller-payments:create", data),
    updateSellerPayment: (data) => ipcRenderer.invoke("trading:seller-payments:update", data),
    deleteSellerPayment: (id) => ipcRenderer.invoke("trading:seller-payments:delete", id),

    listSales: () => ipcRenderer.invoke("trading:sales:list"),
    createSale: (data) => ipcRenderer.invoke("trading:sales:create", data),
    updateSale: (data) => ipcRenderer.invoke("trading:sales:update", data),
    deleteSale: (id) => ipcRenderer.invoke("trading:sales:delete", id),

    listBuyerPayments: (saleId) => ipcRenderer.invoke("trading:buyer-payments:list", saleId),
    createBuyerPayment: (data) => ipcRenderer.invoke("trading:buyer-payments:create", data),
    updateBuyerPayment: (data) => ipcRenderer.invoke("trading:buyer-payments:update", data),
    deleteBuyerPayment: (id) => ipcRenderer.invoke("trading:buyer-payments:delete", id),

    getBalances: () => ipcRenderer.invoke("trading:balances:get"),
    getFinancials: () => ipcRenderer.invoke("trading:reports:getFinancials"),
    getUnifiedTransactions: () => ipcRenderer.invoke("trading:transactions:unified"),

    exportBackup: () => ipcRenderer.invoke("trading:backup:export"),
    selectRestoreFile: () => ipcRenderer.invoke("trading:backup:select-restore-file"),
    restoreBackup: (data) => ipcRenderer.invoke("trading:backup:restore", data),
    listBackupLogs: () => ipcRenderer.invoke("trading:backup:list-logs"),
  }
});
