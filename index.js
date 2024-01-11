const qdrant = require("@qdrant/js-client-rest")
const cohere = require("@langchain/cohere")
const collection_name = "example";

const embed = new cohere.CohereEmbeddings({
    apiKey: "grA5kXUCn3WMrZrEjYO35KoKlTCzCPnwOXGRxxEG"
})
const client = new qdrant.QdrantClient({
    url: "http://localhost:6333",
    timeout: 10 * 1000,
})

const build_documents = (batches) => {
    return batches.map((batch) => {
        return {
            pageContent: Object.entries(batch).map(([key, value]) => `${key}: ${value}`).join(' '),
            metadata: {
                ...batch
            }
        }
    })
}

const sleep = (ms) => {
    console.log('Sleeping')
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const build_points = async (batches) => {
    const documents = build_documents(batches)
    const points = []

    for (const doc of documents) {
        console.log('sleeping for 2 seconds')
        await sleep(2000)
        points.push({
            id: doc.metadata.id,
            vector: await embed.embedQuery(doc.pageContent),
            payload: doc.metadata
        })
    }

    console.log('build points successfully')
    return points
}

const create_collection = async (data) => {
    console.log('Creating collection')
    await client.recreateCollection(collection_name, {
        vectors: {
            distance: 'Cosine',
            size: (await embed.embedQuery('foo')).length,
            on_disk: true
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
            "text-sparse": {
                index: {
                    on_disk: false,
                    full_scan_threshold: 20000
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
        points,
        ordering: 'strong'
    })
    console.log('Updated done!')
}

const search = async (query) => {
    return await client.search(collection_name, {
        vector: await embed.embedQuery(query),
        consistency: 'all',
        with_payload: true,
        score_threshold: .5,
        filter: null,
        limit: 3,
        params: {
            quantization: {
                ingore: false,
                rescore: true,
                oversampling:3.0,
            }
        }
    })
}

const recommend = async (id) => {
    return await client.recommend(collection_name, {
        positive: [id],
        consistency: 'quorum',
        with_payload: true,
        filter: null,
        strategy: "best_score",
        score_threshold: .5,
        limit:3,
        params: {
            quantization: {
                ingore: false,
                rescore: true,
                oversampling:3.0,
            }
        }
    })
}

const data = [
    {
      id: 1,
      name: 'jose',
      age: 34,
      hobbies: ['dibujar', 'cantar'],
      skils: ['development'],
      text: 'jose 34 dibujar cantar development'
    },
    {
      id: 2,
      name: 'maria',
      age: 28,
      hobbies: ['leer', 'bailar'],
      skils: ['design'],
      text: 'maria 28 leer bailar design'
    },
    {
      id: 3,
      name: 'juan',
      age: 42,
      hobbies: ['cocinar', 'jugar futbol'],
      skils: ['marketing'],
      text: 'juan 42 cocinar jugar futbol marketing'
    },
    {
      id: 4,
      name: 'ana',
      age: 25,
      hobbies: ['ver peliculas', 'viajar'],
      skils: ['development'],
      text: 'ana 25 ver peliculas viajar development'
    },
    {
      id: 5,
      name: 'carlos',
      age: 31,
      hobbies: ['tocar guitarra', 'pintar'],
      skils: ['design'],
      text: 'carlos 31 tocar guitarra pintar design'
    },
    {
      id: 6,
      name: 'laura',
      age: 37,
      hobbies: ['hacer yoga', 'escribir'],
      skils: ['marketing'],
      text: 'laura 37 hacer yoga escribir marketing'
    },
    {
      id: 7,
      name: 'pedro',
      age: 29,
      hobbies: ['jugar videojuegos', 'ver series'],
      skils: ['development'],
      text: 'pedro 29 jugar videojuegos ver series development'
    },
    {
      id: 8,
      name: 'luisa',
      age: 33,
      hobbies: ['bailar', 'cantar'],
      skils: ['design'],
      text: 'luisa 33 bailar cantar design'
    },
    {
      id: 9,
      name: 'daniel',
      age: 40,
      hobbies: ['jugar tenis', 'leer'],
      skils: ['marketing'],
      text: 'daniel 40 jugar tenis leer marketing'
    },
    {
      id: 10,
      name: 'sofia',
      age: 26,
      hobbies: ['tocar piano', 'ver peliculas'],
      skils: ['development'],
      text: 'sofia 26 tocar piano ver peliculas development'
    },
  ];

// create_collection(data).then()
// client.scroll(collection_name).then(({ points }) => console.log(points))
search('dibujar').then(data => console.log(data))
// recommend(1).then(data => console.log(data))