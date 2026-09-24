// One place that turns a measurement file's raw bytes into parsed data,
// for BOTH formats the app accepts (LOGDATA-CSV and Excel .xlsx/.xls).
//
// Before this existed, every "load from cloud" path (Import → Anzeige,
// Anzeige → "Aus Cloud hinzufügen", Sessions) had its own copy of
// "download → decodeLatin1 → parseCsvOffMainThread" — only Import's
// "Öffnen" checked for Excel. An .xlsx uploaded to the cloud therefore
// opened fine on Import but failed everywhere else with a parse error.

import { decodeLatin1 } from "./messtoolParser.js";
import { parseCsvOffMainThread } from "./parseCsvOffMainThread.js";
import { downloadMessfile } from "./messtoolStorage.js";
import { withTimeout } from "./withTimeout.js";

export function isExcelName(name) {
  return /\.xlsx?$/i.test(name || "");
}

// options = the same advanced import options Import's buildParseOptions()
// produces (startRow/endRow/startCol/endCol/sampleFrequenz); {} = defaults.
// Excel always uses the first sheet here (no sheet picker outside Import).
export async function parseMessfileBuffer(buffer, name, options = {}, onProgress) {
  let result;
  if (isExcelName(name)) {
    const { parseMesstoolExcel } = await import("./messtoolExcelParser.js");
    result = await parseMesstoolExcel(buffer, undefined, options);
  } else {
    result = await parseCsvOffMainThread(decodeLatin1(buffer), options, onProgress);
  }
  if (!result?.signals?.length) {
    throw new Error(`"${name}": keine Signale gefunden.`);
  }
  return result;
}

export async function parseMessfileUpload(file, options = {}, onProgress) {
  return parseMessfileBuffer(await file.arrayBuffer(), file.name, options, onProgress);
}

export async function downloadAndParseMessfile({ name, storagePath }, options = {}, onProgress) {
  const buffer = await withTimeout(downloadMessfile(storagePath), 25000, `"${name}": Zeitüberschreitung beim Download.`);
  return parseMessfileBuffer(buffer, name, options, onProgress);
}
