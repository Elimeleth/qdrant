/*
Langchain como toda AI basada en conversacion y retriever funcionan con modelos de templates

lo que hacemos es escribir nuestra regla para el funcionamiento de neustro RAG

las variables en {} son para el entendimiento posterior en nuestro algoritmo
*/

const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`

const ANSWER_TEMPLATE = `Answer the question based only on the following context:
{context}

Question: {question}`

module.exports = { CONDENSE_TEMPLATE, ANSWER_TEMPLATE}