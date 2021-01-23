import * as Excel from "exceljs";
import { WordList } from "@common/types";
import { DictionaryEntry } from "@common/types";

const WORD = 1;
const COUNT = 2;

export async function readExcel(
  excelFile: ArrayBuffer | Uint8Array
): Promise<WordList> {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(excelFile);

  /* We're making the following assumptions:
   *
   *  * The first worksheet contains the wordlist
   *  * The first column of the first sheet contains the words
   *  * the second column of the first sheet MAY contain the counts
   */

  const worksheet = workbook.worksheets[0];
  if (worksheet.columnCount < 1) {
    throw new Error(
      `cannot understand worksheet with ${worksheet.columnCount} columns`
    );
  }

  const wordlist: WordList = [];

  worksheet.eachRow((row) => {
    if (shouldRowBeConverted(row)) {
      const word = row.getCell(WORD).text || "";
      const count = asNonNegativeInteger(row.getCell(COUNT).text || 1);
      wordlist.push([word, count]);
    }
  });

  return wordlist;
}

export async function readTSV(TSVFile: File): Promise<WordList> {
  return new Promise((resolve, reject) => {
    const wordlist: WordList = [];

    const reader = new FileReader();
    reader.addEventListener("load", (event: ProgressEvent<FileReader>) => {
      if (event.target && typeof event.target.result === "string") {
        // get file contents
        const rows = event.target.result.split("\n");
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].split("\t");
          if (row.length !== 2) {
            continue;
          }
          const word = row[0] || "";
          const count = asNonNegativeInteger(row[1] || 1);
          wordlist.push([word, count]);
          resolve(wordlist);
        }
      } else {
        reject("Could not read TSV file");
      }
    });
    reader.readAsText(TSVFile);
  });
}

/**
 * Returns a boolean if the row should be converted.
 * The row should not be converted if it is a header row or a commented out row.
 */
function shouldRowBeConverted(row: Excel.Row): boolean {
  const isHeaderRow =
    row.number === 1 && row.getCell(COUNT).text.toLowerCase().includes("count");
  const isCommentRow = row.getCell(WORD).text === "#";
  return !isHeaderRow && !isCommentRow;
}

/**
 * Returns a non-negative integer, or throws an error.
 */
function asNonNegativeInteger(x: unknown): number {
  const n = Number(x) | 0;

  if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
    throw new Error(`Cannot coerce ${x} into non-negative integer`);
  }

  return n;
}

export function readManualEntryData(contents: DictionaryEntry[]): WordList {
  const wordlist: WordList = contents.map((row) => {
    const word = row.word;
    const count = asNonNegativeInteger(row.count || 0);
    return [word, count];
  });
  return wordlist;
}
