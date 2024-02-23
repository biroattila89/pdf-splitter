const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

const OUTPUT_DIRECTORY = path.join(__dirname, 'output');
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
    },
  });

  mainWindow.loadFile('index.html');
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
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'PDFs', extensions: ['pdf'] }],
    });

    if (filePaths.length > 0) {
      const result = await splitPDF(filePaths[0]);
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

async function splitPDF(filePath) {
  try {
    const originalPdfBytes = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const sanitizedFileName = sanitizeFileName(filePath);
    const categorizedPages = categorizePages(pdfDoc, sanitizedFileName);

    await exportCategorizedPages(pdfDoc, categorizedPages, sanitizedFileName);

    return { success: true, message: "All PDFs have been successfully created." };
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
  };

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

async function exportCategorizedPages(pdfDoc, categorizedPages, sanitizedFileName) {
  const outputDirPath = path.join(OUTPUT_DIRECTORY, sanitizedFileName);

  await fs.mkdir(outputDirPath, { recursive: true });

  for (const [fileName, pageIndices] of categorizedPages) {
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

    copiedPages.forEach((page) => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    const newFilePath = path.join(outputDirPath, `${fileName}.pdf`);

    await fs.writeFile(newFilePath, newPdfBytes);
  }
}
