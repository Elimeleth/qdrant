import { compile } from "html-to-text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { RecursiveUrlLoader } from "langchain/document_loaders/web/recursive_url";

const url = "https://bot-whatsapp.netlify.app/docs/";

const compiledConvert = compile({ wordwrap: 130 }); // returns (text: string) => string;

const loader = new RecursiveUrlLoader(url, {
  extractor: compiledConvert,
  maxDepth: 1,
  excludeDirs: [""],
});

const docs = await loader.loadAndSplit(new RecursiveCharacterTextSplitter({
    chunkSize: 50,
    chunkOverlap: 1,
    separators: ["|", "##", ">", "-", '\n', '\n\n'],
  }));

export default docs;