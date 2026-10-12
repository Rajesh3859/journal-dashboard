// Service layer for data management and Electron IPC bridge communication
export const api = {
  getPlatform: () => {
    return window.electronAPI ? window.electronAPI.platform : 'web';
  },

  // Generic invoke helper for electron IPC calls
  invoke: async (channel, ...args) => {
    if (window.electronAPI?.invoke) {
      return await window.electronAPI.invoke(channel, ...args);
    }
    console.warn(`[API] Electron API not found for channel: ${channel}`);
    return null;
  },
};

export default api;
