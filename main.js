const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron/main')
const path = require('node:path')
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');
const logDirectoryDefault = __dirname;
const A4_SHORTER_SIDE_MAX = 700;

const isA4 = (value) => value < A4_SHORTER_SIDE_MAX;
const isBigRatio = (biggerValue, smallerValue) => biggerValue / smallerValue > 1.5;
const isPortrait = (width, height) => width < height;
let mainWindow;

async function logError(error, filePath) {
  const logDirectory = path.join(logDirectoryDefault, 'logs');
  const logFilePath = path.join(logDirectory, 'error.log');
  const timestamp = new Date().toISOString();
  const fileName = path.basename(filePath);
  const errorMessage = `[${timestamp}] Error processing file: ${fileName}\nError Details: ${error.message}\n\n`;

  try {
    // Ensure the logs directory exists
    await fs.mkdir(logDirectory, {recursive: true});

    // Append the error message to the log file
    await fs.appendFile(logFilePath, errorMessage, 'utf8');
  } catch (logError) {
    console.error("Failed to log error:", logError);
  }
}

async function splitPDF(filePath) {
  try {
    const originalPdfBytes = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const rawFileName = path.basename(filePath, path.extname(filePath)).slice(0, 25);
    const sanitizedFileName = rawFileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim()
    const categorizedPages = new Map();
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const progress = (i + 1) / pages.length; // Calculate progress
      mainWindow.webContents.send('progress-update', progress);
      const page = pages[i];
      const {width, height} = page.getSize();
      let category = '';

      if (isPortrait(width, height)) {
        category = isA4(width) ? 'A4_Portrait' : 'A3_Portrait';
      } else {
        category = isA4(height) ? 'A4_Landscape' : 'A3_Landscape';
      }

      if (isBigRatio(Math.max(width, height), Math.min(width, height))) {
        category += '_Long';
      }

      const fullCategory = `${sanitizedFileName}_${category}`;
      if (!categorizedPages.has(fullCategory)) {
        categorizedPages.set(fullCategory, []);
      }
      categorizedPages.get(fullCategory).push(i);
    }

    const outputDirPath = path.join(logDirectoryDefault, 'output', sanitizedFileName)
    await fs.mkdir(outputDirPath, {recursive: true});

    await Promise.all(Array.from(categorizedPages.entries()).map(async ([fileName, pageIndices]) => {
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      const newPdfBytes = await newPdf.save();
      const newFilePath = path.join(outputDirPath, `${fileName}.pdf`);
      await fs.writeFile(newFilePath, newPdfBytes);
    }));

    return {success: true, message: "All PDFs have been successfully created."};
  } catch (error) {
    console.error("Failed to split PDF:", error);
    logError(error, filePath); // Log the error

    return {success: false, message: `Failed to split PDF: ${error.message}`};
  }
}

async function handlePdfSelection() {
  try {
    const {filePaths} = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{name: 'PDFs', extensions: ['pdf']}],
    });

    if (filePaths && filePaths.length > 0) {
      const result = await splitPDF(filePaths[0]);

      if (result.success) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Operation Completed',
          message: result.message,
        });
      } else {
        dialog.showMessageBox({
          type: 'error',
          title: 'Error',
          message: result.message,
        });
      }

      return filePaths[0];
    }
  } catch (error) {
    console.error("Failed to select PDF:", error);
    logError(error, "File selection process");
    dialog.showMessageBox({
      type: 'error',
      title: 'Error',
      message: 'Failed to select PDF',
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 250,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  mainWindow.loadFile('index.html')
  mainWindow.webContents.send('update-counter', '11')
}

app.whenReady().then(() => {
  ipcMain.on('select-pdf', (_event) => handlePdfSelection())
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
