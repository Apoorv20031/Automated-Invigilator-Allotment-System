const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database Testing
  testDB: () => ipcRenderer.invoke('testDB'),

  // Window Management
  openUploadWindow: () => ipcRenderer.invoke('open-upload-window'),

  // ==================== CSV/TABLE OPERATIONS (upload DB) ====================
  insertCsvFiles: (parsedFiles) => ipcRenderer.invoke('insertCsvFiles', parsedFiles),
  getTables: () => ipcRenderer.invoke('getTables'),
  getTableData: (table) => ipcRenderer.invoke('getTableData', table),
  deleteTable: (tableName) => ipcRenderer.invoke('deleteTable', tableName),
  
  // ==================== ROW OPERATIONS (upload DB) ====================
  updateUploadRow: (data) => ipcRenderer.invoke('updateUploadRow', data),
  deleteUploadRow: (data) => ipcRenderer.invoke('deleteUploadRow', data),

  // ==================== EXAM CSV OPERATIONS (exam upload DB) ====================
  examInsertCsvFiles: (parsedFiles) => ipcRenderer.invoke('examInsertCsvFiles', parsedFiles),
  examGetTables: () => ipcRenderer.invoke('examGetTables'),
  examGetTableData: (table) => ipcRenderer.invoke('examGetTableData', table),
  examDeleteTable: (tableName) => ipcRenderer.invoke('examDeleteTable', tableName),

  // ==================== VIEW TABLE OPERATIONS (upload DB) ====================
  getViewTableData: (tableName) => ipcRenderer.invoke('getViewTableData', tableName),
  getViewTableInfo: (tableName) => ipcRenderer.invoke('getViewTableInfo', tableName),
  getViewTables: () => ipcRenderer.invoke('getViewTables'),
  deleteViewTable: (tableName) => ipcRenderer.invoke('deleteViewTable', tableName),

  // ==================== EXAM VIEW TABLE OPERATIONS (exam upload DB) ====================
  getExamUploadTableData: (tableName) => ipcRenderer.invoke('getExamUploadTableData', tableName),
  getExamUploadTableInfo: (tableName) => ipcRenderer.invoke('getExamUploadTableInfo', tableName),
  getExamUploadTables: () => ipcRenderer.invoke('getExamUploadTables'),
  deleteExamUploadTable: (tableName) => ipcRenderer.invoke('deleteExamUploadTable', tableName),
  
  // Add these to the electronAPI exposure:
  examUpdateUploadRow: (data) => ipcRenderer.invoke('examUpdateUploadRow', data),
  examDeleteUploadRow: (data) => ipcRenderer.invoke('examDeleteUploadRow', data),
  
// In your preload.js, add this to the electronAPI exposure:
saveAllotmentTable: (tableData) => ipcRenderer.invoke('saveAllotmentTable', tableData),
  // ==================== DIALOGS ====================
  showSaveDialog: (options) => ipcRenderer.invoke('showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('showMessageBox', options),
  showErrorBox: (title, content) => ipcRenderer.invoke('showErrorBox', title, content),
  // ==================== ALLOTMENT TABLE OPERATIONS (alloted DB) ====================
  getAllotmentTables: () => ipcRenderer.invoke('getAllotmentTables'),
  getAllotmentTableData: (tableName) => ipcRenderer.invoke('getAllotmentTableData', tableName),
  getAllotmentTableInfo: (tableName) => ipcRenderer.invoke('getAllotmentTableInfo', tableName),
  deleteAllotmentTable: (tableName) => ipcRenderer.invoke('deleteAllotmentTable', tableName),
  allotmentTableExists: (tableName) => ipcRenderer.invoke('allotmentTableExists', tableName),
  saveAllotmentTable: (tableData) => ipcRenderer.invoke('saveAllotmentTable', tableData),
  
  // ==================== EVENT HANDLING ====================
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func);
  }
});

// Safe version info exposure
contextBridge.exposeInMainWorld('nodeAPI', {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
  }
});