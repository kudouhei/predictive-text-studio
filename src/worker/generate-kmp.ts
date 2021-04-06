import { generateKmpJson } from "./generate-kmp-json";
import { createZipWithFiles } from "./generate-zip";
import {
  compileModelFromLexicalModelSource,
  WordListFromArray,
} from "@predictive-text-studio/lexical-model-compiler";

/**
 * Generate kmp.json and model.js file, then create a kmp file for the dictionary
 *
 * Format of the lexical model file: {model_id}.model.js
 * the compiled code generated by the @predictive-text-studio/lexical-model-compiler
 *
 * @param langName
 * @param bcp47Tag
 * @param sources
 * @param modelID
 * @param authorName
 * @param copyright
 * @param dictionaryName
 */
export async function generateKmp(
  langName: string,
  bcp47Tag: string,
  sources: WordListFromArray[],
  modelID: string,
  authorName: string | undefined,
  copyright: string | undefined,
  dictionaryName: string | undefined,
): Promise<ArrayBuffer> {
  const kmpJsonFile = generateKmpJson({
    languages: [{ name: langName, id: bcp47Tag }],
    modelID: modelID,
    authorName: authorName,
    copyright: copyright,
    modelUserReadableName: dictionaryName
  });
  const modelFile = compileModelFromLexicalModelSource({
    format: "trie-1.0",
    sources: sources,
  });

  const kmpFile = createZipWithFiles({
    [`${modelID}.model.js`]: modelFile,
    "kmp.json": kmpJsonFile,
  });
  return kmpFile;
}
