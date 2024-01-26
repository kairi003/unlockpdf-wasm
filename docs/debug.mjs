import { qpdfPromise, printLog } from "./script.mjs";
import parse from "./parse.mjs";

globalThis.qpdfExports = { qpdfPromise, printLog };
globalThis.parse = parse;

const qpdfDebugPromise = qpdfPromise.then(qpdf => {
  qpdf.FS.mkdir('/debug');
  return qpdf;
});

const debugFileInput = document.getElementById('debugFile');
const debugFileLoad = document.getElementById('debugFileLoad');
debugFileLoad.addEventListener('click', async () => {
  const qpdf = await qpdfDebugPromise;
  for (const file of debugFileInput.files) {
    const data = new Uint8Array(await file.arrayBuffer());
    const path = `/debug/${file.name}`;
    qpdf.FS.writeFile(path, data);
    printLog(`Write to "${path}" (${data.length} bytes)`, 'system');
  }
});

const debugCommand = document.getElementById('debugCommand');

const parseArgs = () => {
  const debugArgs = document.getElementById('debugArgs');
  let args;
  try {
    args = JSON.parse(debugArgs.value);
  } catch {
    args = parse(debugArgs.value);
  }
  if (debugCommand.value === 'readdir' && args.length === 0) args.push('/debug');
  debugArgs.value = JSON.stringify(args);
  return args;
}

const debugParse = document.getElementById('debugParse');
debugParse.addEventListener('click', parseArgs);

const debugExec = document.getElementById('debugExec');
debugExec.addEventListener('click', async () => {
  const args = parseArgs();
  console.log(args)
  const qpdf = await qpdfDebugPromise;
  const command = debugCommand.value;
  const jargs = JSON.stringify(args);
  switch (command) {
    case 'callMain':
      printLog(`> callMain(${jargs})`, 'system');
      qpdf.callMain(args);
      break;
    case 'downloadFile':
      printLog(`> qpdf.downloadFile(${jargs.slice(1,-1)})`, 'system');
      qpdf.downloadFile(args[0], args[0].split('/').pop());
      break;
    case 'readdir':
    case 'unlink':
      {
        printLog(`> qpdf.FS.${command}(${jargs.slice(1,-1)})`, 'system');
        const ret = qpdf.FS[command](...args);
        printLog(JSON.stringify(ret), 'system');
      }
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
});

