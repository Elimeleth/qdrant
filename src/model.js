/*
Cabe destacar que use cohere por su free tier no comercial

pero se puede usar cloudflare woker con una AI pequeña corriendo como serverless
*/

const { Cohere } = require("@langchain/cohere");
const { getEnvironmentVariable } = require("@langchain/core/utils/env");


const { OpenAI } = require("@langchain/openai");
const { HumanMessage } = require("@langchain/core/messages");

const CohereModel =  new Cohere({
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


const OpenAiModel = new OpenAI({
  temperature: 0,
  openAIApiKey: getEnvironmentVariable('OPENAI_API_KEY'), // In Node.js defaults to process.env.OPENAI_API_KEY
});

module.exports = OpenAiModel