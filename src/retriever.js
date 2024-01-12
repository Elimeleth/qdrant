const { QdrantVectorStore } = require("@langchain/community/vectorstores/qdrant")
const { v4 } = require("uuid")
const { Document } = require("@langchain/core/documents");
const { getEnvironmentVariable } = require("@langchain/core/utils/env");
const { QdrantClient } = require("@qdrant/js-client-rest");
const embeddings = require("./embedding");
const { formatDocumentsAsString } = require("langchain/util/document");

/*----------------------------------------------------------------

La clase QdrantRetriever Extiende de QdrantVectorStore para con ello poder sobreescribir algunos metodos
tanto la configuración del cliente como los metodos de Embeddings y de búsqueda

Basado en el articulo de Qdrant https://qdrant.tech/articles/sparse-vectors/

Podemos acoplar esto en un RunnablePassthrough para poder interactuar mediante un ChatBot
para lograr esto dado que aun no contamos con una libreria en npm que nos facilite la creacion del formato

spalde { indices: number[], values: number[] }
he usado un pequeño API en Python y FastApi

haciendo uso de la libreria pinecone-text https://github.com/pinecone-io/pinecone-text
Esto con el proposito a escribir nuestro método de Embeddings el cual le pasaremos a la clase

Ademas que la clase recibe un argumento opcional el cual es un objeto alli debes declarar { crearte: true } si deseas sobre escribir la colleción

--------------------------------------------------------------------*/
class QdrantRetriever extends QdrantVectorStore {
    constructor(embeddings, args) {
        super(embeddings, args)

        const url = args?.url ?? getEnvironmentVariable("QDRANT_URL");
        const apiKey = args?.apiKey ?? getEnvironmentVariable("QDRANT_API_KEY");

        if (!apiKey && !url.match(/localhost/gim)) {
            throw new Error("Qdrant client require apiKey enviroment.");
        }

        this.client = new QdrantClient({
            url,
            apiKey,
        });
        this.collectionName = args?.collectionName ?? "documents";
        this.collectionConfig = args?.collectionConfig || {};

        if (args?.create) {
            this.deleteCollection().then().catch()
            this.ensureCollection().then();
        }
    }

    async build_documents(batches) {
        const documents = []
        for (const batch of batches) {

            documents.push({
                pageContent: Object.entries(batch).map(([key, value]) => `${key} ${value}`).join(' '),
                metadata: {
                    ...batch
                }
            })
        }

        return documents
    }


    async similaritySearchVectorWithScore(vector, k, filter) {

        /*
            vector puede ser number[][]
            or
            {
                indices: number[],
                values: number[],
            }
        */
        if (!vector) {
            return [];
        }

        if (vector.indices && vector.values) vector = {
            name: 'text',
            vector
        }

        const results = await this.client.search(this.collectionName, {
            vector,
            limit: k,
            filter,
            params: {
                quantization: {
                    rescore: false
                },
                hnsw_ef: 128,
                exact: false
            },
        });
        const result = results.map((res) => [
            new Document({
                metadata: res.payload.metadata,
                pageContent: res.payload.content,
            }),
            res.score,
        ]);
        return result;
    }

    async addDocuments(batches, documentOptions) {
        const documents = await this.build_documents(batches)
        const texts = documents.map(doc => doc.pageContent);
        await this.addVectors(await this.embeddings.embedDocuments(texts), documents, documentOptions);
    }

    async addVectors(vectors, documents, documentOptions) {
        if (vectors.length === 0) {
            return;
        }
        console.log('here data here')
        const points = vectors.map((vector, idx) => ({
            id: v4(),
            vector: (vector?.indices && vector?.values) ? { 'text': vector } : vector,
            payload: {
                content: documents[idx].pageContent,
                metadata: documents[idx].metadata,
                customPayload: documentOptions?.customPayload[idx],
            },
        }));
        try {
            await this.client.updateCollection(
                this.collectionName, {
                "optimizers_config": {
                    indexing_threshold: 0,
                }
            });

            await this.client.upsert(this.collectionName, {
                wait: true,
                points,
            });

            await this.client.updateCollection(
                this.collectionName, {
                "optimizers_config": {
                    indexing_threshold: 20000,
                    memmap_threshold: 20000
                }
            });

            await this.client.createPayloadIndex(this.collectionName, {
                field_name: "text",
                field_schema: "text"
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any

            console.log("upsert done!")
        }
        catch (e) {
            const error = new Error(`${e?.status ?? "Undefined error code"} ${e?.message}: ${e?.data?.status?.error}`);
            throw error;
        }
    }

    async ensureCollection() {
        const response = await this.client.getCollections();
        const collectionNames = response.collections.map((collection) => collection.name);

        if (!collectionNames.includes(this.collectionName)) {
            await this.client.recreateCollection(this.collectionName, {
                vectors: {
                    distance: 'Cosine',
                    size: (await this.embeddings.embedQuery('foo'))?.length || 384,
                    quantization_config: {
                        scalar: {
                            type: "int8",
                            quantile: 0.99,
                            always_ram: true,
                        }
                    },
                },
                "optimizers_config": {
                    indexing_threshold: 0,
                    memmap_threshold: 0
                },
                sparse_vectors: {
                    "text": {
                        index: {
                            on_disk: false
                        }
                    }
                }
            });
            console.log('Collection created successfully')
        }

        console.log('Collection found: ' + this.collectionName)
    }

    async scroll() {
        return await this.client.scroll(this.collectionName, { with_vector: true, with_payload: true })
    }

    async deleteCollection() {
        return this.client.deleteCollection(this.collectionName)
    }

}

const vectorStore = new QdrantRetriever(embeddings, { create: false })

module.exports = { vectorStore, retriever: vectorStore.asRetriever() }