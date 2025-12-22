const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();


// ==================== CACHE FIXES ====================
// Set custom cache directories to avoid permission issues
app.setPath('userData', path.join(app.getPath('appData'), 'College-Examination-System'));
app.setPath('cache', path.join(app.getPath('userData'), 'Cache'));

// Add command line switches to prevent cache errors
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-features', 'DiskCache');
// Global variables to hold window and database references
let mainWindow;
let uploadWindow;
let mainDb;  // collageexamination.db (for exams)
let uploadDb; // uploadfile.db (for CSV data)
let examUploadDb; // examfiles.db (for exam CSV data)
let allotedDb; // NEW: alloted database for session storage

// ==================== WINDOW MANAGEMENT ====================

/**
 * Creates the main browser window for the application
 */
/**
 /**
 * Creates the main browser window for the application
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Additional optimizations
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    title: 'College Examination System',
    show: false, // Don't show until ready
    backgroundColor: '#ffffff', // Prevent white flash
    minWidth: 800,
    minHeight: 600
  });

  mainWindow.removeMenu(); // Hide default menu

  mainWindow.loadFile('index.html');

  // Show window when ready (no DevTools in any mode)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Creates the upload browser window
 */
function createUploadWindow() {
  uploadWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    title: 'Upload Data',
    show: false // Don't show until ready
  });

  uploadWindow.removeMenu(); // Hide default menu

  uploadWindow.loadFile('upload.html');

  // Show window when ready
  uploadWindow.once('ready-to-show', () => {
    uploadWindow.show();
  });

  uploadWindow.on('closed', () => {
    uploadWindow = null;
  });
}
// ==================== DATABASE INITIALIZATION ====================

/**
 * Initializes the upload database schema (for CSV data)
 */
function initializeUploadDatabase() {
  uploadDb.serialize(() => {
    // Create main table for all CSV data
    uploadDb.run(`CREATE TABLE IF NOT EXISTS all_csv_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

/**
 * Initializes the exam upload database schema (for exam CSV data)
 */
function initializeExamUploadDatabase() {
  examUploadDb.serialize(() => {
    // Create main table for all exam CSV data
    examUploadDb.run(`CREATE TABLE IF NOT EXISTS all_exam_csv_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  });
  
  // Note: Uncomment the line below to clear specific tables if needed
  // examUploadDb.run(`DROP TABLE IF EXISTS templet15_csv`);
}

// ==================== APPLICATION STARTUP ====================

// When app is ready, set up databases and create window
app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  
  // Main database connection (collageexamination.db)
  mainDb = new sqlite3.Database(
    path.join(userDataPath, 'collageexamination.db'),
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
      if (err) {
        console.error('Main DB error:', err);
        dialog.showErrorBox('Database Error', 'Failed to initialize main database');
      } else {
        console.log('Connected to main database');
      
        // Upload database connection (for CSV data - uploadfile.db)
        uploadDb = new sqlite3.Database(
          path.join(userDataPath, 'uploadfile.db'),
          sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
          (err) => {
            if (err) {
              console.error('Upload DB error:', err);
              dialog.showErrorBox('Database Error', 'Failed to initialize upload database');
            } else {
              console.log('Connected to upload database');
              initializeUploadDatabase();
              
              // Exam upload database connection (for exam CSV data - examfiles.db)
              examUploadDb = new sqlite3.Database(
                path.join(userDataPath, 'examfiles.db'),
                sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                (err) => {
                  if (err) {
                    console.error('Exam Upload DB error:', err);
                    dialog.showErrorBox('Database Error', 'Failed to initialize exam upload database');
                  } else {
                    console.log('Connected to exam upload database');
                    initializeExamUploadDatabase();
                    
                    // NEW: Alloted database connection
                    allotedDb = new sqlite3.Database(
                      path.join(userDataPath, 'alloted.db'),
                      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                      (err) => {
                        if (err) {
                          console.error('Alloted DB error:', err);
                          dialog.showErrorBox('Database Error', 'Failed to initialize alloted database');
                        } else {
                          console.log('Connected to alloted database');
                          createMainWindow();
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

// ==================== APPLICATION SHUTDOWN ====================

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const closePromises = [];
    
    // Close main database
    if (mainDb) {
      closePromises.push(new Promise(resolve => {
        mainDb.close((err) => {
          if (err) console.error('Error closing main DB:', err);
          resolve();
        });
      }));
    }
    
    // Close upload database
    if (uploadDb) {
      closePromises.push(new Promise(resolve => {
        uploadDb.close((err) => {
          if (err) console.error('Error closing upload DB:', err);
          resolve();
        });
      }));
    }
    
    // Close exam upload database
    if (examUploadDb) {
      closePromises.push(new Promise(resolve => {
        examUploadDb.close((err) => {
          if (err) console.error('Error closing exam upload DB:', err);
          resolve();
        });
      }));
    }
    
    // NEW: Close alloted database
    if (allotedDb) {
      closePromises.push(new Promise(resolve => {
        allotedDb.close((err) => {
          if (err) console.error('Error closing alloted DB:', err);
          resolve();
        });
      }));
    }
    
    // Quit app after all databases are closed
    Promise.all(closePromises).then(() => app.quit());
  }
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Sanitizes table/column names to prevent SQL injection
 * @param {string} name - The name to sanitize
 * @returns {string} - Sanitized name
 */
function sanitize(name) {
  return name.replace(/[^a-zA-Z00_]/g, '_');
}

/**
 * Validates table name to prevent SQL injection
 * @param {string} tableName - The table name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateTableName(tableName) {
  return typeof tableName === 'string' && 
         /^[a-zA-Z0-9_]+$/.test(tableName) &&
         !tableName.includes(' ') &&
         !tableName.includes(';');
}

// ==================== IPC HANDLERS ====================

// ==================== DATABASE TESTING ====================

/**
 * Test database connections
 */
ipcMain.handle('testDB', async () => {
  return new Promise((resolve) => {
    resolve({
      mainDB: 'Main database connected',
      uploadDB: 'Upload database connected',
      examUploadDB: 'Exam upload database connected',
      allotedDB: 'Alloted database connected' // NEW: Added alloted DB status
    });
  });
});

// ==================== WINDOW MANAGEMENT ====================

/**
 * Open upload window
 */
ipcMain.handle('open-upload-window', () => {
  if (!uploadWindow) {
    createUploadWindow();
  }
});

// ==================== CSV/TABLE HANDLERS (use uploadDb) - For upload.html ====================

/**
 * Insert CSV files into database
 */
ipcMain.handle('insertCsvFiles', async (event, parsedFiles) => {
  const mergedTable = 'all_csv_data';

  // Helper function to run SQL queries
  const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    uploadDb.run(sql, params, function(err) {
      if (err) reject(err.message);
      else resolve();
    });
  });

  // Helper function to get table columns
  const getColumns = (table) => new Promise((resolve) => {
    uploadDb.all(`PRAGMA table_info(${table});`, [], (err, rows) => {
      if (err) return resolve([]);
      resolve(rows.map((row) => row.name));
    });
  });

  try {
    // First pass: collect all possible columns from all files
    let allColumns = new Set();
    for (const file of parsedFiles) {
      file.headers.map(sanitize).forEach(col => allColumns.add(col));
    }

    // Ensure merged table has all columns
    let mergedCols = await getColumns(mergedTable);
    for (const col of allColumns) {
      if (!mergedCols.includes(col)) {
        await runQuery(`ALTER TABLE \`${mergedTable}\` ADD COLUMN \`${col}\` TEXT`);
      }
    }

    // Process each file
    for (const file of parsedFiles) {
      const tableName = sanitize(file.name);
      const originalHeaders = file.headers;
      const headers = originalHeaders.map(sanitize);

      // Process and filter rows
      const rows = file.rows
        .map(row => {
          const sanitizedRow = {};
          originalHeaders.forEach((orig) => {
            const cleanKey = sanitize(orig);
            sanitizedRow[cleanKey] = row[orig]?.trim?.() || '';
          });
          return sanitizedRow;
        })
        .filter(row => Object.values(row).some(val => val && val.trim() !== ''));

      // Create/update individual table
      let existingCols = await getColumns(tableName);
      if (existingCols.length === 0) {
        const colDefs = headers.map((h) => `\`${h}\` TEXT`).join(', ');
        await runQuery(
          `CREATE TABLE IF NOT EXISTS \`${tableName}\` (id INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs}, source_file TEXT)`
        );
      } else {
        // Add any missing columns
        for (const col of headers) {
          if (!existingCols.includes(col)) {
            await runQuery(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` TEXT`);
          }
        }
      }

      // Insert rows with duplicate prevention
      for (const row of rows) {
        const values = headers.map((h) => row[h] ?? '');
        const sourceFileValue = file.name;

        // Insert into individual table
        const insertSQL = `
          INSERT INTO \`${tableName}\` (${[...headers.map((h) => `\`${h}\``), 'source_file'].join(', ')})
          SELECT ${[...headers.map(() => '?'), '?'].join(', ')} 
          WHERE NOT EXISTS (
            SELECT 1 FROM \`${tableName}\` WHERE 
            ${headers.map(h => `\`${h}\` = ?`).join(' AND ')}
          )`;
        
        await runQuery(insertSQL, [...values, sourceFileValue, ...values]);

        // Insert into merged table
        const mergedInsertSQL = `
          INSERT INTO \`${mergedTable}\` (${[...headers.map((h) => `\`${h}\``), 'source_file'].join(', ')})
          SELECT ${[...headers.map(() => '?'), '?'].join(', ')} 
          WHERE NOT EXISTS (
            SELECT 1 FROM \`${mergedTable}\` WHERE 
            ${headers.map(h => `\`${h}\` = ?`).join(' AND ')}
          )`;
        
        await runQuery(mergedInsertSQL, [...values, sourceFileValue, ...values]);
      }
    }

    return { success: true, message: `${parsedFiles.length} files processed` };
  } catch (err) {
    console.error('Insert CSV error:', err);
    return { success: false, error: err.message };
  }
});

/**
 * Get list of tables from upload database
 */
ipcMain.handle('getTables', async () => {
  return new Promise((resolve, reject) => {
    uploadDb.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      [],
      (err, rows) => {
        if (err) reject(err.message);
        else resolve(rows.map((r) => r.name));
      }
    );
  });
});

/**
 * Get data from specific table in upload database
 */
ipcMain.handle('getTableData', async (event, table) => {
  return new Promise((resolve, reject) => {
    uploadDb.all(`SELECT * FROM \`${table}\``, [], (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows);
    });
  });
});

/**
 * Delete table from upload database
 */
ipcMain.handle('deleteTable', async (event, tableName) => {
  return new Promise((resolve, reject) => {
    if (!tableName || typeof tableName !== 'string') {
      reject('Invalid table name');
      return;
    }

    uploadDb.run(`DROP TABLE IF EXISTS \`${tableName}\``, function(err) {
      if (err) {
        console.error('Error deleting table:', err);
        reject(err.message);
      } else {
        console.log(`Table ${tableName} deleted`);
        resolve(true);
      }
    });
  });
});

// ==================== ROW OPERATIONS (upload DB) ====================

/**
 * Update a row in an upload table
 */
ipcMain.handle('updateUploadRow', async (event, { tableName, pkColumn, rowId, updatedData }) => {
  try {
    // Validate inputs
    if (!tableName || !pkColumn || !rowId || !updatedData) {
      throw new Error('Missing required parameters');
    }

    // Verify table exists
    const tableExists = await new Promise((resolve) => {
      uploadDb.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", 
        [tableName],
        (err, row) => resolve(!!row && !err)
      );
    });

    if (!tableExists) {
      throw new Error(`Table "${tableName}" does not exist`);
    }

    // Build and execute update query
    const setParts = Object.keys(updatedData).map(key => `\`${key}\` = ?`);
    const values = [...Object.values(updatedData), rowId];

    const result = await new Promise((resolve, reject) => {
      uploadDb.run(
        `UPDATE \`${tableName}\` 
         SET ${setParts.join(', ')} 
         WHERE \`${pkColumn}\` = ?`,
        values,
        function(err) {
          if (err) {
            reject(new Error(`Database error: ${err.message}`));
          } else {
            resolve({
              success: true,
              changes: this.changes,
              message: `Updated ${this.changes} row(s)`
            });
          }
        }
      );
    });

    return result;
  } catch (error) {
    console.error('Update failed:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack 
    };
  }
});

/**
 * Delete a row from an upload table
 */
ipcMain.handle('deleteUploadRow', async (event, { tableName, rowId }) => {
  if (!validateTableName(tableName)) {
    return { success: false, error: 'Invalid table name' };
  }

  return new Promise((resolve) => {
    try {
      // Get the primary key column name
      uploadDb.get(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
        if (err) {
          console.error('Error getting table info:', err);
          resolve({ success: false, error: 'Failed to get table structure' });
          return;
        }

        const pkColumn = columns.find(col => col.pk === 1)?.name || 'id';
        
        const sql = `DELETE FROM \`${tableName}\` WHERE \`${pkColumn}\` = ?`;
        
        uploadDb.run(sql, [rowId], function(err) {
          if (err) {
            console.error('Error deleting row:', err);
            resolve({ 
              success: false, 
              error: err.message || 'Database delete failed' 
            });
          } else {
            resolve({ 
              success: true, 
              changes: this.changes,
              message: 'Row deleted successfully'
            });
          }
        });
      });
    } catch (error) {
      console.error('Unexpected error in deleteUploadRow:', error);
      resolve({ 
        success: false, 
        error: error.message || 'Unexpected error occurred' 
      });
    }
  });
});

// ==================== EXAM UPLOAD HANDLERS (use examUploadDb) - For upload1.html ====================

/**
 * Insert exam CSV files into database
 */
ipcMain.handle('examInsertCsvFiles', async (event, parsedExamFiles) => {
  const mergedTable = 'all_exam_csv_data';

  // Helper function to run SQL queries
  const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    examUploadDb.run(sql, params, function(err) {
      if (err) reject(err.message);
      else resolve();
    });
  });

  // Helper function to get table columns
  const getColumns = (table) => new Promise((resolve) => {
    examUploadDb.all(`PRAGMA table_info(${table});`, [], (err, rows) => {
      if (err) return resolve([]);
      resolve(rows.map((row) => row.name));
    });
  });

  try {
    // First pass: collect all possible columns from all files
    let allColumns = new Set();
    for (const file of parsedExamFiles) {
      file.headers.map(sanitize).forEach(col => allColumns.add(col));
    }

    // Ensure merged table has all columns
    let mergedCols = await getColumns(mergedTable);
    for (const col of allColumns) {
      if (!mergedCols.includes(col)) {
        await runQuery(`ALTER TABLE \`${mergedTable}\` ADD COLUMN \`${col}\` TEXT`);
      }
    }

    // Process each file
    for (const file of parsedExamFiles) {
      const tableName = sanitize(file.name);
      const originalHeaders = file.headers;
      const headers = originalHeaders.map(sanitize);

      // Process and filter rows
      const rows = file.rows
        .map(row => {
          const sanitizedRow = {};
          originalHeaders.forEach((orig) => {
            const cleanKey = sanitize(orig);
            sanitizedRow[cleanKey] = row[orig]?.trim?.() || '';
          });
          return sanitizedRow;
        })
        .filter(row => Object.values(row).some(val => val && val.trim() !== ''));

      // Create/update individual table
      let existingCols = await getColumns(tableName);
      if (existingCols.length === 0) {
        const colDefs = headers.map((h) => `\`${h}\` TEXT`).join(', ');
        await runQuery(
          `CREATE TABLE IF NOT EXISTS \`${tableName}\` (id INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs}, source_file TEXT)`
        );
      } else {
        // Add any missing columns
        for (const col of headers) {
          if (!existingCols.includes(col)) {
            await runQuery(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` TEXT`);
          }
        }
      }

      // Insert rows with duplicate prevention
      for (const row of rows) {
        const values = headers.map((h) => row[h] ?? '');
        const sourceFileValue = file.name;

        // Insert into individual table
        const insertSQL = `
          INSERT INTO \`${tableName}\` (${[...headers.map((h) => `\`${h}\``), 'source_file'].join(', ')})
          SELECT ${[...headers.map(() => '?'), '?'].join(', ')} 
          WHERE NOT EXISTS (
            SELECT 1 FROM \`${tableName}\` WHERE 
            ${headers.map(h => `\`${h}\` = ?`).join(' AND ')}
          )`;
        
        await runQuery(insertSQL, [...values, sourceFileValue, ...values]);

        // Insert into merged table
        const mergedInsertSQL = `
          INSERT INTO \`${mergedTable}\` (${[...headers.map((h) => `\`${h}\``), 'source_file'].join(', ')})
          SELECT ${[...headers.map(() => '?'), '?'].join(', ')} 
          WHERE NOT EXISTS (
            SELECT 1 FROM \`${mergedTable}\` WHERE 
            ${headers.map(h => `\`${h}\` = ?`).join(' AND ')}
          )`;
        
        await runQuery(mergedInsertSQL, [...values, sourceFileValue, ...values]);
      }
    }

    return { success: true, message: `${parsedExamFiles.length} exam files processed` };
  } catch (err) {
    console.error('Insert exam CSV error:', err);
    return { success: false, error: err.message };
  }
});

/**
 * Get list of tables from exam upload database
 */
ipcMain.handle('examGetTables', async () => {
  return new Promise((resolve, reject) => {
    examUploadDb.all(
      `SELECT name FROM sqlite_master 
       WHERE type='table' 
       AND name NOT LIKE 'sqlite_%'
       AND name NOT IN ('all_exam_csv_data', 'exam_files_metadata', 'merged_exam_data')`,
      [],
      (err, rows) => {
        if (err) reject(err.message);
        else resolve(rows.map((r) => r.name));
      }
    );
  });
});

/**
 * Get data from specific table in exam upload database
 */
ipcMain.handle('examGetTableData', async (event, table) => {
  return new Promise((resolve, reject) => {
    examUploadDb.all(`SELECT * FROM \`${table}\``, [], (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows);
    });
  });
});

/**
 * Delete table from exam upload database
 */
ipcMain.handle('examDeleteTable', async (event, tableName) => {
  return new Promise((resolve, reject) => {
    if (!tableName || typeof tableName !== 'string') {
      reject('Invalid table name');
      return;
    }

    examUploadDb.run(`DROP TABLE IF EXISTS \`${tableName}\``, function(err) {
      if (err) {
        console.error('Error deleting exam table:', err);
        reject(err.message);
      } else {
        console.log(`Exam table ${tableName} deleted`);
        resolve(true);
      }
    });
  });
});

// ==================== VIEW TABLE HANDLERS (viewtable.html) ====================

/**
 * Get all data from specified table
 */
ipcMain.handle('getViewTableData', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  return new Promise((resolve, reject) => {
    uploadDb.all(`SELECT * FROM \`${tableName}\``, [], (err, rows) => {
      if (err) {
        console.error(`Error fetching data from ${tableName}:`, err);
        reject(err.message);
      } else {
        resolve(rows || []);
      }
    });
  });
});

/**
 * Get table schema information
 */
ipcMain.handle('getViewTableInfo', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  return new Promise((resolve, reject) => {
    uploadDb.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`Error getting table info for ${tableName}:`, err);
        reject(err);
        return;
      }

      const pkColumn = columns.find(col => col.pk === 1);
      resolve({
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull === 1,
          pk: col.pk === 1
        })),
        primaryKey: pkColumn ? pkColumn.name : 'id'
      });
    });
  });
});

/**
 * Get list of all tables in database
 */
ipcMain.handle('getViewTables', async () => {
  return new Promise((resolve, reject) => {
    uploadDb.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      [],
      (err, rows) => {
        if (err) {
          console.error('Error getting tables:', err);
          reject(err.message);
        } else {
          resolve(rows.map(r => r.name));
        }
      }
    );
  });
});

/**
 * Delete specified table
 */
ipcMain.handle('deleteViewTable', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  return new Promise((resolve, reject) => {
    uploadDb.run(`DROP TABLE IF EXISTS \`${tableName}\``, function(err) {
      if (err) {
        console.error(`Error deleting table ${tableName}:`, err);
        reject(err);
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
});

// ==================== EXAM UPLOAD TABLE HANDLERS ====================

/**
 * Get all data from specified exam table
 */
ipcMain.handle('getExamUploadTableData', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  return new Promise((resolve, reject) => {
    examUploadDb.all(`SELECT * FROM \`${tableName}\``, [], (err, rows) => {
      if (err) {
        console.error(`Error fetching data from ${tableName}:`, err);
        reject(err.message);
      } else {
        resolve(rows || []);
      }
    });
  });
});

/**
 * Get table schema information for exam table
 */
ipcMain.handle('getExamUploadTableInfo', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  return new Promise((resolve, reject) => {
    examUploadDb.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`Error getting table info for ${tableName}:`, err);
        reject(err);
        return;
      }

      const pkColumn = columns.find(col => col.pk === 1);
      resolve({
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull === 1,
          pk: col.pk === 1
        })),
        primaryKey: pkColumn ? pkColumn.name : 'id'
      });
    });
  });
});

/**
 * Get list of all tables in exam database
 */
ipcMain.handle('getExamUploadTables', async () => {
  return new Promise((resolve, reject) => {
    examUploadDb.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      [],
      (err, rows) => {
        if (err) {
          console.error('Error getting tables:', err);
          reject(err.message);
        } else {
          resolve(rows.map(r => r.name));
        }
      }
    );
  });
});

/**
 * Delete specified exam table
 */
ipcMain.handle('deleteExamUploadTable', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  return new Promise((resolve, reject) => {
    examUploadDb.run(`DROP TABLE IF EXISTS \`${tableName}\``, function(err) {
      if (err) {
        console.error(`Error deleting table ${tableName}:`, err);
        reject(err);
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
});

// ==================== EXAM UPLOAD ROW OPERATIONS ====================

/**
 * Update a row in an exam table
 */
ipcMain.handle('examUpdateUploadRow', async (event, { tableName, pkColumn, rowId, updatedData }) => {
  try {
    // Validate inputs
    if (!tableName || !pkColumn || !rowId || !updatedData) {
      throw new Error('Missing required parameters');
    }

    // Verify table exists
    const tableExists = await new Promise((resolve) => {
      examUploadDb.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", 
        [tableName],
        (err, row) => resolve(!!row && !err)
      );
    });

    if (!tableExists) {
      throw new Error(`Exam table "${tableName}" does not exist`);
    }

    // Build and execute update query
    const setParts = Object.keys(updatedData).map(key => `\`${key}\` = ?`);
    const values = [...Object.values(updatedData), rowId];

    const result = await new Promise((resolve, reject) => {
      examUploadDb.run(
        `UPDATE \`${tableName}\` 
         SET ${setParts.join(', ')} 
         WHERE \`${pkColumn}\` = ?`,
        values,
        function(err) {
          if (err) {
            reject(new Error(`Database error: ${err.message}`));
          } else {
            resolve({
              success: true,
              changes: this.changes,
              message: `Updated ${this.changes} row(s) in exam table`
            });
          }
        }
      );
    });

    return result;
  } catch (error) {
    console.error('Exam table update failed:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack 
    };
  }
});

/**
 * Delete a row from an exam table
 */
ipcMain.handle('examDeleteUploadRow', async (event, { tableName, pkColumn, rowId }) => {
  try {
    // Validate inputs
    if (!tableName || !pkColumn || !rowId) {
      throw new Error('Missing required parameters');
    }

    // Verify table exists
    const tableExists = await new Promise((resolve) => {
      examUploadDb.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", 
        [tableName],
        (err, row) => resolve(!!row && !err)
      );
    });

    if (!tableExists) {
      throw new Error(`Exam table "${tableName}" does not exist`);
    }

    const result = await new Promise((resolve, reject) => {
      examUploadDb.run(
        `DELETE FROM \`${tableName}\` WHERE \`${pkColumn}\` = ?`,
        [rowId],
        function(err) {
          if (err) {
            reject(new Error(`Database error: ${err.message}`));
          } else {
            resolve({
              success: true,
              changes: this.changes,
              message: `Deleted ${this.changes} row(s) from exam table`
            });
          }
        }
      );
    });

    return result;
  } catch (error) {
    console.error('Exam table delete failed:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack 
    };
  }
});
// ==================== ALLOTMENT TABLE HANDLERS ====================

/**
 * Save complete allotment table with structure and data to allotedDb
 */
ipcMain.handle('saveAllotmentTable', async (event, tableData) => {
  try {
    const { tableName, headers, rows, savedAt } = tableData;
    
    if (!validateTableName(tableName)) {
      throw new Error('Invalid table name');
    }
    
    // Create the allotment table with a structure that preserves the multi-level headers
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saved_at TEXT,
        header_data TEXT, -- Store headers as JSON
        row_data TEXT,    -- Store row data as JSON
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await new Promise((resolve, reject) => {
      allotedDb.run(createTableSQL, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Check if table already exists and delete existing data
    const deleteSQL = `DELETE FROM \`${tableName}\``;
    await new Promise((resolve, reject) => {
      allotedDb.run(deleteSQL, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Insert the table data
    const insertSQL = `
      INSERT INTO \`${tableName}\` (saved_at, header_data, row_data)
      VALUES (?, ?, ?)
    `;
    
    await new Promise((resolve, reject) => {
      allotedDb.run(
        insertSQL, 
        [savedAt, JSON.stringify(headers), JSON.stringify(rows)], 
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    return { success: true, message: `Allotment table '${tableName}' saved successfully` };
    
  } catch (error) {
    console.error('Save allotment table error:', error);
    return { success: false, error: error.message };
  }
});
// ==================== ALLOTMENT TABLE HANDLERS ====================

/**
 * Get all saved allotment tables from allotedDb
 */
ipcMain.handle('getAllotmentTables', async () => {
  return new Promise((resolve, reject) => {
    allotedDb.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      [],
      (err, rows) => {
        if (err) {
          console.error('Error getting allotment tables:', err);
          reject(err.message);
        } else {
          resolve(rows.map(r => r.name));
        }
      }
    );
  });
});

/**
 * Get specific allotment table data from allotedDb
 */
ipcMain.handle('getAllotmentTableData', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }
  
  return new Promise((resolve, reject) => {
    allotedDb.all(`SELECT * FROM \`${tableName}\``, [], (err, rows) => {
      if (err) {
        console.error(`Error fetching data from ${tableName}:`, err);
        reject(err.message);
      } else {
        // Parse the JSON data if it exists
        const parsedRows = rows.map(row => ({
          id: row.id,
          saved_at: row.saved_at,
          header_data: row.header_data ? JSON.parse(row.header_data) : [],
          row_data: row.row_data ? JSON.parse(row.row_data) : [],
          created_at: row.created_at
        }));
        resolve(parsedRows);
      }
    });
  });
});

/**
 * Get allotment table info (structure) from allotedDb
 */
ipcMain.handle('getAllotmentTableInfo', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }
  
  return new Promise((resolve, reject) => {
    allotedDb.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`Error getting table info for ${tableName}:`, err);
        reject(err);
        return;
      }
      
      resolve({
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull === 1,
          pk: col.pk === 1
        }))
      });
    });
  });
});

/**
 * Delete allotment table from allotedDb
 */
ipcMain.handle('deleteAllotmentTable', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }
  
  return new Promise((resolve, reject) => {
    allotedDb.run(`DROP TABLE IF EXISTS \`${tableName}\``, function(err) {
      if (err) {
        console.error(`Error deleting allotment table ${tableName}:`, err);
        reject(err);
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
});

/**
 * Check if allotment table exists in allotedDb
 */
ipcMain.handle('allotmentTableExists', async (event, tableName) => {
  if (!validateTableName(tableName)) {
    return false;
  }
  
  return new Promise((resolve) => {
    allotedDb.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", 
      [tableName],
      (err, row) => resolve(!!row && !err)
    );
  });
});


// ==================== DIALOG HANDLERS ====================

/**
 * Show save dialog
 */
ipcMain.handle('showSaveDialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

/**
 * Show open dialog
 */
ipcMain.handle('showOpenDialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

/**
 * Show message box
 */
ipcMain.handle('showMessageBox', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

/**
 * Show error box
 */
ipcMain.handle('showErrorBox', async (event, title, content) => {
  dialog.showErrorBox(title, content);
});
