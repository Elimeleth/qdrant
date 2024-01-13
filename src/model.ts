/*
Cabe destacar que use cohere por su free tier no comercial

pero se puede usar cloudflare woker con una AI pequeña corriendo como serverless
*/

import { Cohere } from "@langchain/cohere";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

import { ChatOpenAI } from "@langchain/openai";

import { ChatCloudflareWorkersAI } from "@langchain/cloudflare";
import { StringOutputParser } from "@langchain/core/output_parsers";

const CloudflareModel = new ChatCloudflareWorkersAI({
    model: "@cf/meta/llama-2-7b-chat-fp16",
    cloudflareAccountId: "35f5836daf61eba20f4fd3010d037b87",
    cloudflareApiToken: "Bwy5yiS3JRsmigErQhOEKcmH-7Gu8GTrKhhxCyv_",
    maxConcurrency: 2,
    maxRetries: 5,
    onFailedAttempt: (err) => {
        console.log(`Ocurrio un error: ${err?.message}`)
    },
}).pipe(new StringOutputParser())

const CohereModel = new Cohere({
  apiKey: getEnvironmentVariable('COHERE_API_KEY'), // Default
  maxRetries: 2,
  temperature: .5,
  maxTokens: 50,
  maxConcurrency: 2,
  cache: true,
  onFailedAttempt: (err) => {
    console.log({ err })
  }
});


const OpenAiModel = new ChatOpenAI({
  openAIApiKey: getEnvironmentVariable('OPENAI_API_KEY'),
  temperature: 0,
  maxTokens: 250,
  maxRetries: 2,
  maxConcurrency: 5,
  // modelName: MODELS_NAMES_OPENAI.GPT_3_5_TURBO_0613,
  configuration: {
    basePath: "https://oai.hconeai.com/v1",
    baseOptions: {
      headers: {
        // Add your Helicone API Key
        "Helicone-Auth": "Bearer sk-helicone-x5gkkwa-mngubcy-twykwcy-ya7pvwq",
        "Helicone-Cache-Enabled": "false"
      }
    }
  }
})

// console.log(OPENAI_CHAT_MODEL.invoke('como se dice adios en portugues?').then(response => console.log(response)))
export default CloudflareModel