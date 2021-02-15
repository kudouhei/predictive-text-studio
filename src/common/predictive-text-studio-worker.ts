/**
 * This interface establishes a communication protocol between the UI thread and the worker thread
 */

import type { RelevantKmpOptions } from "@common/kmp-json-file";
import type {
  DictionaryEntry,
  KeyboardDataWithTime,
  ProjectMetadata,
  WordList,
  WordListSource,
} from "@common/types";

export interface PredictiveTextStudioWorker {
  /////////////////////// Modify dictionary sources ////////////////////////

  /**
   * Save a Google Sheet to the current project
   */
  readGoogleSheet(name: string, wordList: WordList): void;

  /**
   * Compile the lexical model using files in the IndexedDB
   * Take a dictionary source and store it.
   *
   * @param name the dictionary source name — typically the uploaded filename.
   * @param contents the actual file itself
   * @return {number} how many words were added by this source
   */
  addDictionarySourceToProject(name: string, contents: File): Promise<number>;

  /**
   * Store the manual entry data into the database
   * @param tableData Manual entry data
   */
  addManualEntryDictionaryToProject(tableData: {
    name: string;
    data: DictionaryEntry[];
  }): Promise<number>;

  ///////////////////////////// Event handlers /////////////////////////////

  /**
   * Register a callback that is called directly before the KMP package is
   * generated.
   */
  onPackageCompileStart(callback: () => void): void;

  /**
   * Register a callbcak that is called if the KMP package compilation fails.
   */
  onPackageCompileError(callback: (err: Error) => void): void;

  /**
   * Register a callback that is called when the KMP package has succesfully
   * compiled.
   */
  onPackageCompileSuccess(callback: (kmp: ArrayBuffer) => void): void;

  ////////////////////// Manipulate project metadata ///////////////////////

  /**
   * Sets optional and required metadata such as BCP-47, language name, author
   * name, copyright string, etc.
   *
   * Note that the KMP package requires at least a BCP-47 tag before it can
   * compile properly.
   *
   * @see RelevantKmpOptions
   */
  setProjectData(
    metadata: Partial<Readonly<RelevantKmpOptions>>
  ): Promise<void>;

  /**
   * Returns all of the current project's metadata.
   */
  fetchAllCurrentProjectMetadata(): Promise<ProjectMetadata>;

  ///////////////////////////////// Caches /////////////////////////////////

  /**
   * Retrieving Keyman keyboard data from the IndexedDB storage
   */
  // TODO: rename to getCachedKeyboardCatalog or something
  // The current name is way too generic for such a specific functionality
  getDataFromStorage(): Promise<KeyboardDataWithTime[]>;

  /**
   * Retrieving File data from the IndexedDB storage
   */
  getFilesFromStorage(): Promise<WordListSource[]>;
}
