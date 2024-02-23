const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

const DEFAULT_OUTPUT_DIRECTORY = path.join(__dirname, 'output');
const LOG_DIRECTORY = path.join(__dirname, 'logs');
const ERROR_LOG_PATH = path.join(LOG_DIRECTORY, 'error.log');
const A4_SHORTER_SIDE_MAX = 700;

const isA4 = (dimension) => dimension < A4_SHORTER_SIDE_MAX;
const isBigRatio = (larger, smaller) => larger / smaller > 1.5;
const isPortrait = (width, height) => width < height;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 250,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    },
  });

  mainWindow.loadFile('index.html');

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {role: 'quit'}
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: async () => {
            await shell.openExternal('https://github.com/biroattila89/pdf-splitter');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.on('select-pdf', handlePdfSelection);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

async function handlePdfSelection() {
  try {
    mainWindow.setProgressBar(-1);

    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'PDFs', extensions: ['pdf'] }],
      message: 'Select pdf file to split'
    });

    if (filePaths.length > 0) {
      const { filePaths: outputPaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        message: 'Select an output folder for the split PDFs'
      })
      let customOutputPath = DEFAULT_OUTPUT_DIRECTORY;
      if (outputPaths.length > 0) {
        customOutputPath = outputPaths[0];
      }

      const result = await splitPDF(filePaths[0], customOutputPath);
      showAlert(result);
    }
  } catch (error) {
    logError(error, "File selection process");
    showAlert({ success: false, message: 'Failed to select PDF' });
  }
}

function showAlert({ success, message }) {
  dialog.showMessageBox(mainWindow, {
    type: success ? 'info' : 'error',
    title: success ? 'Operation Completed' : 'Error',
    message,
  });
}

async function logError(error, context) {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Error in ${context}: ${error.message}\n\n`;

  try {
    await fs.mkdir(LOG_DIRECTORY, { recursive: true });
    await fs.appendFile(ERROR_LOG_PATH, errorMessage, 'utf8');
  } catch (logError) {
    console.error("Failed to log error:", logError);
  }
}

async function splitPDF(filePath, outputDirPath) {
  try {
    const originalPdfBytes = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const sanitizedFileName = sanitizeFileName(filePath);
    const categorizedPages = categorizePages(pdfDoc, sanitizedFileName);
    const outputFinalDirPath = path.join(outputDirPath, sanitizedFileName);

    await exportCategorizedPages(pdfDoc, categorizedPages, sanitizedFileName, outputFinalDirPath);
    mainWindow.setProgressBar(-1);

    return { success: true, message: `All PDFs have been successfully created and can be found in the directory: ${outputFinalDirPath}` };
  } catch (error) {
    logError(error, `Splitting PDF: ${path.basename(filePath)}`);

    return { success: false, message: `Failed to split PDF: ${error.message}` };
  }
}

function sanitizeFileName(filePath) {
  const rawFileName = path.basename(filePath, path.extname(filePath)).slice(0, 25);

  return rawFileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
}

function categorizePages(pdfDoc, sanitizedFileName) {
  const pages = pdfDoc.getPages();
  const categorizedPages = new Map();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const progress = (i + 1) / pages.length;
    const { width, height } = page.getSize();
    const category = determineCategory(width, height);
    const fullCategory = `${sanitizedFileName}_${category}`;

    if (!categorizedPages.has(fullCategory)) {
      categorizedPages.set(fullCategory, []);
    }
    categorizedPages.get(fullCategory).push(i);
    mainWindow.webContents.send('progress-update', progress);
    mainWindow.setProgressBar(progress);
  }

  return categorizedPages;
}

function determineCategory(width, height) {
  let category = isPortrait(width, height) ? 'A4_Portrait' : 'A4_Landscape';

  if (!isA4(isPortrait(width, height) ? width : height)) {
    category = category.replace('A4', 'A3');
  }

  if (isBigRatio(Math.max(width, height), Math.min(width, height))) {
    category += '_Long';
  }

  return category;
}

async function exportCategorizedPages(pdfDoc, categorizedPages, sanitizedFileName, outputFinalDirPath) {
  await fs.mkdir(outputFinalDirPath, { recursive: true });

  for (const [fileName, pageIndices] of categorizedPages) {
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

    copiedPages.forEach((page) => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    const newFilePath = path.join(outputFinalDirPath, `${fileName}.pdf`);

    await fs.writeFile(newFilePath, newPdfBytes);
  }
}
