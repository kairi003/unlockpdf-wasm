import QPDF from './qpdf.mjs';

const printf = (msg, isError = false) => {
  const tmp = document.getElementById(
    isError ? 'stderrTemplate' : 'stdoutTemplate');
  const clone = tmp.content.cloneNode(true);
  const rec = clone.querySelector('.record');
  rec.textContent = msg;
  const logger = document.getElementById('logger');
  logger.appendChild(clone);
  const autoScroll = document.getElementById('autoScroll');
  if (autoScroll.checked) {
    logger.scrollTop = logger.scrollHeight;
  }
}
document.getElementById('clearLog').addEventListener('click', () => {
  const logger = document.getElementById('logger');
  logger.innerHTML = '';
});

const qpdfPromise = QPDF({
  print: msg => printf(msg, false),
  printErr: msg => printf(msg, true),
}).then(qpdf => {
  qpdf.FS.mkdir('/unlock');
  console.log('QPDF loaded.');
  return qpdf;
});

const unlockPdf = async (data, password) => {
  const qpdf = await qpdfPromise;
  qpdf.FS.writeFile('/unlock/input.pdf', data);
  const ret = qpdf.callMain([
    '--decrypt',
    '/unlock/input.pdf',
    '--password=' + password,
    '/unlock/output.pdf'
  ]);
  if (ret !== 0) {
    throw new Error('Failed to decrypt the PDF file.');
  }
  const outputData = qpdf.FS.readFile('/unlock/output.pdf');
  const blob = new Blob([outputData], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return url;
}

const inputForm = document.getElementById('inputForm');
const fileInput = document.getElementById('file');
const passwordInput = document.getElementById('password');
inputForm.addEventListener('submit', async event => {
  event.preventDefault();
  const file = fileInput.files[0];
  const password = passwordInput.value;
  if (!file || !password) {
    return false;
  }
  const srcName = file.name;
  const destName = srcName.replace(/\.pdf$/, '.decrypted.pdf');

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  const spinner = document.getElementById('spinner');
  spinner.classList.add('show');
  const downlaod = document.getElementById('downloadLink');
  URL.revokeObjectURL(downlaod.href || '');
  try {
    const url = await unlockPdf(data, password);
    downlaod.href = url;
    downlaod.download = destName;
    downlaod.click();
  } catch (e) {
    console.error(e);
    window.alert(e);
  } finally {
    spinner.classList.remove('show');
  }
  return false;
});