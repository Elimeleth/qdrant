import "dotenv/config"

/*
Langchain: https://js.langchain.com/docs/expression_language/how_to/routing#using-a-custom-function

Un runnable es un algoritmo por el cual podemos tener control de nuestro RAG
con algo de logica un poco avancada podriamos controlar los callbacks que usa langchain por debajo
y con ello tener aún más control sobre nuestro chatbot
*/

import { PromptTemplate }  from "@langchain/core/prompts";
import {
    RunnableSequence,
    RunnablePassthrough,
}  from "@langchain/core/runnables";
import { StringOutputParser }  from "@langchain/core/output_parsers";
import { formatDocumentsAsString }  from "langchain/util/document";


import { CONDENSE_TEMPLATE, ANSWER_TEMPLATE }  from "./templates";

import { retriever }  from "./retriever";

import model from "./model";

type Conversational = {
    question: string,
    chat_history: [string, string][]
}

type ChatHistory = [string, string]

class RunnablePassthroughChat {
    chat_history: ChatHistory[] = [];
    retriever = retriever;
    CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(CONDENSE_TEMPLATE)
    ANSWER_TEMPLATE = PromptTemplate.fromTemplate(ANSWER_TEMPLATE)

    formatChatHistory(chat_history: ChatHistory[]) {
        if (!chat_history.length) return ''
        const formattedDialogueTurns = chat_history.map(
            (dialogueTurn: ChatHistory) => `Human: ${dialogueTurn[0]}\nAssistant: ${dialogueTurn[1]}`
        );
        return formattedDialogueTurns.join("\n");
    };

    conversationalRetrievalQAChain() {
        const standaloneQuestionChain = RunnableSequence.from([
            {
                question: (input: Conversational) => input.question,
                chat_history: (input: Conversational) =>
                    // esto con la finalidad de que nuestro RAG tenga conocimiento del flujo
                    this.formatChatHistory(input.chat_history) // convertimos nuestro historial [pregunta, respuesta][] a un Human: ...\nAssistant: ...,
            },
            this.CONDENSE_QUESTION_PROMPT,
            model,
            new StringOutputParser() // aplaca la salida a string,
        ]);

        const answerChain = RunnableSequence.from([
            {
              context: this.retriever.pipe(formatDocumentsAsString),
              question: new RunnablePassthrough(),
            },
            this.ANSWER_TEMPLATE,
            model,
          ]);

        return standaloneQuestionChain.pipe(answerChain)
    }


    async call(question: string) {
        try {
            const conversationalRetrievalQAChain = this.conversationalRetrievalQAChain()

            const content = await conversationalRetrievalQAChain.invoke({
                question,
                chat_history: this.chat_history
            })

            this.chat_history.push([question, content])

            return content
        } catch (error) {
            console.log({ error })
            return ''
        }
    }
}

const main = async () => {
    const runnable = new RunnablePassthroughChat()
    const content = await runnable.call('construye un flow que responda a hola')

    console.log(content)
}

await main()