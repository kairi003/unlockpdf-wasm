import QPDF from './qpdf.mjs';

const printLog = (msg, isError = false) => {
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
  print: msg => printLog(msg, false),
  printErr: msg => printLog(msg, true),
  downloadFile: function (filename, dstName, options) {
    const outputData = this.FS.readFile(filename);
    const blob = new Blob([outputData], options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = dstName;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  },
}).then(qpdf => {
  qpdf.FS.mkdir('/unlock');
  globalThis.qpdf = qpdf;
  qpdf.callMain(['--version']);
  return qpdf;
});

const unlockPdf = async (file, password) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const dstName = file.name.replace(/\.pdf$/, '.decrypted.pdf');
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
  qpdf.downloadFile('/unlock/output.pdf', dstName, {
    type: 'application/pdf',
  });
  return;
}

const inputForm = document.getElementById('inputForm');
const fileInput = document.getElementById('file');
const passwordInput = document.getElementById('password');
inputForm.addEventListener('submit', async event => {
  event.preventDefault();
  const file = fileInput.files[0];
  const password = passwordInput.value;
  if (!file || !password) return false;
  const spinner = document.getElementById('spinner');
  spinner.classList.add('show');
  try {
    printLog('Start to unlock...');
    await unlockPdf(file, password);
    printLog('Done.');
  } catch (e) {
    console.error(e);
    window.alert(e);
  } finally {
    spinner.classList.remove('show');
  }
  return false;
});
