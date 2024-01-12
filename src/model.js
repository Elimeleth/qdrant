/*
Cabe destacar que use cohere por su free tier no comercial

pero se puede usar cloudflare woker con una AI pequeña corriendo como serverless
*/

const { Cohere } = require("@langchain/cohere");
const { getEnvironmentVariable } = require("@langchain/core/utils/env");


const { ChatOpenAI } = require("@langchain/openai");

const CohereModel = new Cohere({
  apiKey: getEnvironmentVariable('COHERE_API_KEY'), // Default
  maxRetries: 2,
  temperature: 0,
  maxTokens: 90,
  maxConcurrency: 2,
  cache: true,
  onFailedAttempt: (err) => {
    console.log({ err })
  }
});


const OPENAI_CHAT_MODEL = new ChatOpenAI({
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
module.exports = OPENAI_CHAT_MODEL