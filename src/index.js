require("dotenv/config")

/*
Langchain: https://js.langchain.com/docs/expression_language/how_to/routing#using-a-custom-function

Un runnable es un algoritmo por el cual podemos tener control de nuestro RAG
con algo de logica un poco avancada podriamos controlar los callbacks que usa langchain por debajo
y con ello tener aún más control sobre nuestro chatbot
*/

const { PromptTemplate } = require("@langchain/core/prompts");
const {
    RunnableSequence,
    RunnablePassthrough,
} = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { formatDocumentsAsString } = require("langchain/util/document");


const { ANSWER_TEMPLATE, CONDENSE_TEMPLATE } = require("./templates");

const model = require("./model");
const retriever = require("./retriever");


class RunnablePassthroughChat {
    chat_history = [];
    retriever = retriever;
    CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(CONDENSE_TEMPLATE) // El primer PROMPT indica como actuar en consecuencia
    ANSWER_PROMPT = PromptTemplate.fromTemplate(ANSWER_TEMPLATE) // El segundo PROMPT indica como responder
    

    formatChatHistory(chatHistory) {
        const formattedDialogueTurns = chatHistory.map(
            (dialogueTurn) => `Human: ${dialogueTurn[0]}\nAssistant: ${dialogueTurn[1]}`
        );
        return formattedDialogueTurns.join("\n");
    };

    async conversationalRetrievalQAChain() {
        const standaloneQuestionChain = RunnableSequence.from([
            {
                question: (input) => input.question,
                chat_history: (input) =>
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
                question: new RunnablePassthrough() // Construimos nuestro Runnable
            },
            this.ANSWER_PROMPT,
            model,
        ]);

        return standaloneQuestionChain.pipe(answerChain)
    }


    async call(question) {
        try {
            const conversationalRetrievalQAChain = await this.conversationalRetrievalQAChain()

            const content = await conversationalRetrievalQAChain.invoke({
                question,
                chat_history: this.chat_history,
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
    const content = await runnable.call('Que precio tiene el Nike Air Max 90?')

    console.log(content)
}

main().then()