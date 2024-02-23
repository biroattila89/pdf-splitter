const progressEl = document.getElementById('progress');
const progressTextEl = document.getElementById('progress-text');
const body = document.getElementById('progress-body');

window.electronAPI.onProgressUpdate((progress) => {
  const progressValue = `${progress * 100}%`;
  if (progress > 0) {
    body.style.opacity = 1;
    progressEl.style.width = progressValue;
    progressTextEl.innerText = progressValue;
  } else {
    body.style.opacity = 0;
  }
});

document.getElementById('select-pdf-btn').addEventListener('click', async () => {
  window.electronAPI.selectPDF();
});
