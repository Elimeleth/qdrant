require("dotenv/config")
const { QdrantVectorStore } = require("@langchain/community/vectorstores/qdrant")
const { v4 } = require("uuid")
const { Document } = require("@langchain/core/documents");
const { getEnvironmentVariable } = require("@langchain/core/utils/env");
const { QdrantClient } = require("@qdrant/js-client-rest");


const embed = {
    embedQuery: (query) => new Promise((resolve) => resolve([])),
    embedDocuments: (query) => new Promise((resolve) => resolve([])),
}

class QdrantRetriever extends QdrantVectorStore {
    constructor(embeddings, args) {
        super(embeddings, args)

        const url = args.url ?? getEnvironmentVariable("QDRANT_URL");
        const apiKey = args.apiKey ?? getEnvironmentVariable("QDRANT_API_KEY");
        console.log(url)
        
        if (!apiKey && !url.match(/localhost/gim)) {
            throw new Error("Qdrant client require apiKey enviroment.");
        }
        
        this.client = new QdrantClient({
            url,
            apiKey,
        });
        this.collectionName = args.collectionName ?? "documents";
        this.collectionConfig = args.collectionConfig || {};

        this.ensureCollection().then();
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
        
        const results = await this.client.search(this.collectionName, {
            vector,
            limit: k,
            filter,
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

    async addVectors(vectors, documents, documentOptions, type) {
        if (vectors.length === 0) {
            return;
        }
        console.log('here data here')
        const points = vectors.map((vector, idx) => ({
            id: v4(),
            vector: type === 'sparse' ? {
                'text': {
                    vector
                }
            }: vector,
            payload: {
                content: documents[idx].pageContent,
                metadata: documents[idx].metadata,
                customPayload: documentOptions?.customPayload[idx],
            },
        }));
        try {
            await client.updateCollection(
                this.collection_name, {
                "optimizers_config": {
                    indexing_threshold: 0,
                }
            });

            await this.client.upsert(this.collectionName, {
                wait: true,
                points,
            });

            await client.updateCollection(
                this.collection_name, {
                "optimizers_config": {
                    indexing_threshold: 20000,
                }
            });
            
            await client.createPayloadIndex(this.collection_name, {
                field_name: "text",
                field_schema: "text"
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (e) {
            const error = new Error(`${e?.status ?? "Undefined error code"} ${e?.message}: ${e?.data?.status?.error}`);
            throw error;
        }
    }

    async ensureCollection() {
        const response = await this.client.getCollections();
        console.log(response)
        const collectionNames = response.collections.map((collection) => collection.name);
        
        if (!collectionNames.includes(this.collectionName)) {
            console.log(this.collectionConfig)
            await this.client.recreateCollection(this.collectionName, {
                vectors: {
                    distance: 'Cosine',
                    size: (await embed.embedQuery('foo'))?.length || 384,
                    on_disk: false
                },
                "optimizers_config": {
                    default_segment_number: 5,
                    indexing_threshold: 0,
                },
                "quantization_config": {
                    binary: {
                        always_ram: true
                    }
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

}


const retriver = new QdrantRetriever(embed, {})
// console.log({ retriver })


module.exports = QdrantRetriever