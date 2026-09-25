const { contextBridge, ipcRenderer } = require('electron');

// Expose the narrow, secure ElectronBridge to the web application
contextBridge.exposeInMainWorld('electronBridge', {
  isElectron: true,

  // Hardware binding and system fingerprinting
  getSystemFingerprint: async () => {
    return ipcRenderer.invoke('security:get-fingerprint');
  },

  // Real OS machine and hostname info
  getDeviceInfo: async () => {
    return ipcRenderer.invoke('security:get-device-info');
  },

  // TPM / cryptographic hardware attestation
  getAttestationToken: async () => {
    return ipcRenderer.invoke('security:get-attestation');
  },

  // Lockdown commands
  enableLockdown: async () => {
    return ipcRenderer.invoke('security:enable-lockdown');
  },

  disableLockdown: async () => {
    return ipcRenderer.invoke('security:disable-lockdown');
  },

  // Active displays telemetry
  getDisplayCount: async () => {
    return ipcRenderer.invoke('security:get-display-count');
  },

  // Close / quit the exam lockdown shell
  closeExamShell: async () => {
    return ipcRenderer.invoke('security:close-shell');
  },

  // Security violations listener (focus lost, shortcut attempts, multi-display attach)
  onSecurityViolation: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('security:violation', subscription);
    return () => {
      ipcRenderer.removeListener('security:violation', subscription);
    };
  },
});
