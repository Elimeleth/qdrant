require("dotenv/config")
const qdrant = require("@qdrant/js-client-rest")
const cohere = require("@langchain/cohere");
const collection_name = "example";

const { getEnvironmentVariable } = require("@langchain/core/utils/env");

const { default: axios } = require("axios")

const embed = {
    embedQuery: async (text) => (await axios.get(`http://localhost:8000/embed/${text}`)).data,
    embedDocuments: async (text) => (await axios.get(`http://localhost:8000/embed/${text}`)).data
}
const client = new qdrant.QdrantClient({
    url: "http://localhost:6333"
})

const build_documents = async (batches) => {
    const documents = []
    for (const batch of batches) {
        
        documents.push({
            pageContent: Object.entries(batch).map(([key, value]) => `${key}: ${value}`).join(' '),
            metadata: {
                ...batch,
                vector: {
                    'text': {
                        ...await embed.embedQuery(Object.values(batch).join(' '))
                    }
                }
            }
        })
    }
    
    return documents
}

const build_points = async (batches) => {
    const documents = await build_documents(batches)
    const points = []
    
    for (const doc of documents) {
        points.push({
            id: doc.metadata.id,
            vector: doc.metadata.vector,
            payload: doc.metadata
        })
    }

    console.log('build points successfully')
    return points
}

const create_collection = async (data) => {
    console.log('Creating collection')
    await client.recreateCollection(collection_name, {
        // vectors: {
        //     distance: 'Cosine',
        //     size: (await embed.embedQuery('foo')).length,
        //     on_disk: true
        // },
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
    })

    await upsert_collection(data)

    await client.updateCollection(
        collection_name, {
        "optimizers_config": {
            indexing_threshold: 20000,
        }
    })
    
    await client.createPayloadIndex(collection_name, {
        field_name: "text",
        field_schema: "text"
    })

    console.log('Collection created successfully')
}

const upsert_collection = async (batches) => {
    console.log('Updating collection')
    const points = await build_points(batches)
    
    await client.upsert(collection_name, {
        points
    })
    console.log('Updated done!')
}

const search = async (query) => {
    return await client.search(collection_name, {
        // vector: {
        //     name: 'text',
        //     vector: 
        // },
        consistency: 'all',
        // with_payload: true,
        score_threshold: .2,
        with_vector: true,
        filter: null,
        limit: 3,
        params: {
            quantization: {
                ingore: false,
                rescore: true,
                oversampling:3.0
            }
        }
    })
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
create_collection(shoes).then()
// client.scroll(collection_name).then(({ points }) => console.log(points))
// search('').then(data => console.log(data))

// console.log(Object.values({ hola: "holas", como: "como", estas: "estas" }).join(' '))