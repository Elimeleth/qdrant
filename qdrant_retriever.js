require("dotenv/config")
const { QdrantVectorStore } = require("@langchain/community/vectorstores/qdrant")
const { v4 } = require("uuid")
const { Document } = require("@langchain/core/documents");
const { getEnvironmentVariable } = require("@langchain/core/utils/env");
const { QdrantClient } = require("@qdrant/js-client-rest");
const embeddings = require("./embedding");

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

        if (args?.create) this.ensureCollection().then();
    }

    async build_documents (batches) {
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

    async scroll () {
        return await this.client.scroll(this.collectionName, { with_vector: true, with_payload: true})
    }

    async deleteCollection () {
        return this.client.deleteCollection(this.collectionName)
    }

}


const shoes = [
    { id: 1, name: 'Nike Air Max 90', brand: 'Nike', color: 'White Black', size: 10, price: 120 },
    { id: 2, name: 'Adidas Ultraboost 21', brand: 'Adidas', color: 'Black White', size: 9.5, price: 180 },
    { id: 3, name: 'New Balance 990v5', brand: 'New Balance', color: 'Grey', size: 11, price: 175 },
    { id: 4, name: 'Puma RS X3', brand: 'Puma', color: 'White Blue', size: 10.5, price: 100 },
    { id: 5, name: 'Reebok Classic Leather', brand: 'Reebok', color: 'Black', size: 9, price: 75 },
    //   Add more shoes with similar data as needed
    { id: 6, name: 'Nike Air Max 270', brand: 'Nike', color: 'Black White', size: 11, price: 150 },
    { id: 7, name: 'Adidas Ultraboost 22', brand: 'Adidas', color: 'Black White', size: 10, price: 160 },
    { id: 8, name: 'New Balance 991v2', brand: 'New Balance', color: 'Grey', size: 12, price: 180 },
    { id: 9, name: 'Puma RS X4', brand: 'Puma', color: 'White Blue', size: 11.5, price: 100 },
    { id: 10, name: 'Reebok Classic Leather', brand: 'Reebok', color: 'Black', size: 10, price: 70 },
    // Add more shoes with similar data as needed
];

const main  = async () => {

    const vectorStore = new QdrantRetriever(embeddings, {})
    // await vectorStore.addDocuments(shoes)
    // await vectorStore.deleteCollection()


    const vector = await embeddings.embedQuery('Nike Air')
    const data = await vectorStore.similaritySearch(vector, 2)
    console.log(data)

    // const data = await vectorStore.similaritySearch(vector)
    // console.log(data)

    const { points } = await vectorStore.scroll()
    // console.log(points.map(point => point.payload))


    // const retriever = vectorStore.asRetriever()
    // const documents = await retriever.getRelevantDocuments('Nike Air Max 90')
    // console.log(documents)
}

main().then()
module.exports = QdrantRetriever