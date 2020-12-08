import { KeyboardData, KeyboardDataWithTime } from "./storage-models";
import { KeymanAPI } from "./keyman-api-service";
import { readExcel, readManualEntryData } from "./read-wordlist";
import { PredictiveTextStudioWorker } from "@common/predictive-text-studio-worker";
import { linkStorageToKmp } from "./link-storage-to-kmp";
import Storage from "./storage";
import { WordList } from "@common/types";
import { RelevantKmpOptions } from "@common/kmp-json-file";
import { DictionaryEntry } from "@common/types";

/**
 * The default model version. 1.0.0 also happens to be the minimum model
 * version that the Keyman team will publish.
 */
const defaultVersion = "1.0.0";
/**
 * The default copyright.
 */
const defaultCopyright = "";
/**
 * expiryThreshold is used to decide if keyboard data is too old
 * currently it is set to seven days in millisecond
 */
const expiryThreshold = 604800000;

function doNothing() {
  // intentionally empty
}

export class PredictiveTextStudioWorkerImpl
  implements PredictiveTextStudioWorker {
  constructor(
    private storage = new Storage(),
    private keymanAPI = new KeymanAPI()
  ) {
    this.getLanguageData();
  }

  async updateBCP47Tag(bcp47Tag: string): Promise<void> {
    await this.storage.updateBCP47Tag(bcp47Tag);
    return this.generateKMPFromStorage();
  }

  async fetchLanguageDataFromService(): Promise<void> {
    this.keymanAPI.fetchLanaguageData().then((languages: KeyboardData[]) => {
      languages.forEach(async (data) => {
        await this.storage.addKeyboardData(data.language, data.bcp47Tag);
      });
    });
  }

  async getDataFromStorage(): Promise<KeyboardDataWithTime[]> {
    return this.storage.fetchKeyboardData();
  }

  async getLanguageData(): Promise<void> {
    let dateDiff: number;
    const keyboardData: KeyboardDataWithTime[] = await this.storage.fetchKeyboardData();
    const datenow: Date = new Date();
    if (keyboardData.length !== 0) {
      dateDiff = datenow.getTime() - keyboardData[0].timestamp.getTime();
      if (dateDiff > expiryThreshold) {
        await this.storage.deleteKeyboardData();
        this.fetchLanguageDataFromService();
      }
    } else {
      this.fetchLanguageDataFromService();
    }
  }

  async readGoogleSheet(
    name: string,
    wordListObject: WordList
  ): Promise<ArrayBuffer> {
    this.storage.saveFile(name, wordListObject);
    return await linkStorageToKmp(this.storage);
  }

  private async generateKMPFromStorage(): Promise<void> {
    // TODO: Parse multiple dictionary sources, right now just reading the first file
    this._emitPackageCompileStart();

    const storedFiles = await this.storage.fetchAllFiles();
    if (storedFiles.length < 1) {
      this._emitPackageCompileError(
        new Error("Cannot find any files in the IndexedDB")
      );
    } else {
      const kmpArrayBuffer = await linkStorageToKmp(this.storage);
      this.saveKMPPackage(kmpArrayBuffer);
      this._emitPackageCompileSuccess();
    }
  }

  async addDictionarySourceToProject(
    name: string,
    contents: File
  ): Promise<number> {
    const wordlist = await readExcel(await contents.arrayBuffer());
    await this.storage.saveFile(name, wordlist);
    this.generateKMPFromStorage();
    return wordlist.length;
  }

  async addManualEntryDictionaryToProject(tableData: {
    name: string;
    data: DictionaryEntry[];
  }): Promise<number> {
    const dictionaryName = tableData.name;
    const wordlist = readManualEntryData(tableData.data);
    await this.storage.saveFile(dictionaryName, wordlist);
    return wordlist.length;
  }

  private _emitPackageCompileStart: () => void = doNothing;
  private _emitPackageCompileError: (err: Error) => void = doNothing;
  private _emitPackageCompileSuccess: () => void = doNothing;

  onPackageCompileStart(callback: () => void): void {
    this._emitPackageCompileStart = callback;
  }

  onPackageCompileError(callback: (err: Error) => void): void {
    this._emitPackageCompileError = callback;
  }

  onPackageCompileSuccess(callback: () => void): void {
    this._emitPackageCompileSuccess = callback;
  }

  setProjectData(
    metadata: Partial<Readonly<RelevantKmpOptions>>
  ): Promise<void> {
    let langName = "";
    let bcp47Tag = "";
    if (metadata.languages == undefined) {
      langName = "";
      bcp47Tag = "";
    } else {
      langName = metadata.languages[0].name;
      bcp47Tag = metadata.languages[0].id;
    }

    const authorName = metadata.authorName || "UnknownAuthor";
    const modelID = metadata.modelID || `${authorName}.${bcp47Tag}.${langName}`;
    const copyright = metadata.copyright || defaultCopyright;
    const version = metadata.version || defaultVersion;

    const storedData = {
      langName: langName,
      bcp47Tag: bcp47Tag,
      authorName: authorName,
      modelID: modelID,
      copyright: copyright,
      version: version,
    };
    return this.storage.updateProjectData(storedData);
  }

  private saveKMPPackage(kmp: ArrayBuffer): Promise<void> {
    return this.storage.saveCompiledKMPAsArrayBuffer(kmp);
  }

  async getKMPPackage(): Promise<ArrayBuffer> {
    return this.storage.fetchCompiledKMPFile();
  }
}
