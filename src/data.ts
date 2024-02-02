import { compile } from "html-to-text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { GithubRepoLoader } from "langchain/document_loaders/web/github";
const url = "https://github.com/codigoencasa/bot-whatsapp/tree/typescript/packages";

const loader = new GithubRepoLoader(
  url,
  {
    accessToken: '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',
    branch: 'main',

    ignoreFiles: ['*.md', 'node_modules', '*.json', '*.yaml'],
    recursive: true,
    unknown: "warn",
    maxConcurrency: 3, // Defaults to 2
  }
);
const docs = await loader.loadAndSplit(new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 1,
  separators: ['\n\n\n', '\n\n']
}));

export default docs;