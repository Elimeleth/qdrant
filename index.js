require("dotenv/config")
const qdrant = require("@qdrant/js-client-rest")
const cohere = require("@langchain/cohere");
const collection_name = "example";

const { getEnvironmentVariable } = require("@langchain/core/utils/env");

const embed = new cohere.CohereEmbeddings({
    apiKey: getEnvironmentVariable("COHERE_API_KEY")
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
                ...batch,
                vector: {
                    'text': {
                        ...batch.vector
                    }
                }
            }
        }
    })
}

const build_points = (batches) => {
    const documents = build_documents(batches)
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
    const points = build_points(batches)
    await client.upsert(collection_name, {
        points
    })
    console.log('Updated done!')
}

const search = async (query) => {
    return await client.search(collection_name, {
        vector: {
            name: 'text',
            vector: {'indices': [1023837959, 3867408905, 1581001053, 1568472017, 659326392], 'values': [0.16598806579159123, 0.14151152988199817, 0.32824587919109305, 0.2846760094255305, 0.07957851570978698]} 
        },
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

const data = [
    {
      id: 1,
      name: 'jose',
      age: 34,
      hobbies: ['dibujar', 'cantar'],
      skils: ['development'],
      text: 'jose 34 dibujar cantar development',
      vector: {'indices': [1023837959, 3867408905, 1581001053, 1568472017, 659326392], 'values': [0.16598806579159123, 0.14151152988199817, 0.32824587919109305, 0.2846760094255305, 0.07957851570978698]} 


    },
    {
      id: 2,
      name: 'maria',
      age: 28,
      hobbies: ['leer', 'bailar'],
      skils: ['design'],
      text: 'maria 28 leer bailar design',
      vector: {'indices': [2145688632, 2182422062, 3377006606, 2819574740, 1598346136], 'values': [0.18301576778241263, 0.13118478636481762, 0.2820198086619707, 0.30921588351040413, 0.09456375368039502]}
    },
    {
      id: 3,
      name: 'juan',
      age: 42,
      hobbies: ['cocinar', 'jugar futbol'],
      skils: ['marketing'],
      text: 'juan 42 cocinar jugar futbol marketing',
      vector: {'indices': [938403888, 3159925814, 3975314048, 1434444387, 1352370384, 1690623792], 'values': [0.13453355594436248, 0.11198034232819776, 0.2599533920350729, 0.21682923681636912, 0.20190202040644215, 0.07480145246955568]}
    },
    {
      id: 4,
      name: 'ana',
      age: 25,
      hobbies: ['ver peliculas', 'viajar'],
      skils: ['development'],
      text: 'ana 25 ver peliculas viajar development',
      vector: {'indices': [3687962970, 1246280156, 3964372239, 71709443, 1689222131, 659326392], 'values': [0.15425799194514855, 0.08472258966965059, 0.1794361668496252, 0.26580885289622924, 0.24777731754044605, 0.06799708109890036]} 
    },
    {
      id: 5,
      name: 'carlos',
      age: 31,
      hobbies: ['tocar guitarra', 'pintar'],
      skils: ['design'],
      text: 'carlos 31 tocar guitarra pintar design',
      vector: {'indices': [3966014633, 538856249, 3823906332, 628924933, 3314430771, 1598346136], 'values': [0.1377412868268089, 0.09531442790153904, 0.23098708373327878, 0.21226269233972436, 0.25699669222754024, 0.06669781697110874]} 
    },
    {
      id: 6,
      name: 'laura',
      age: 37,
      hobbies: ['hacer yoga', 'escribir'],
      skils: ['marketing'],
      text: 'laura 37 hacer yoga escribir marketing',
      vector: {'indices': [3784277245, 1813251204, 457967288, 1924410461, 3101395903, 1690623792], 'values': [0.15620331556885866, 0.12860068978912537, 0.2155425419304469, 0.1497639320146108, 0.2642702583739405, 0.08561926232301771]}
    },
    {
      id: 7,
      name: 'pedro',
      age: 29,
      hobbies: ['jugar videojuegos', 'ver series'],
      skils: ['development'],
      text: 'pedro 29 jugar videojuegos ver series development',
      vector: {'indices': [2237783722, 1475817810, 1434444387, 1587014533, 3964372239, 1289061206, 659326392], 'values': [0.14917225622324606, 0.09386608084358869, 0.2070812348962598, 0.25667725187866, 0.15883077628420603, 0.07418370232429003, 0.060188697549749384]}
    },
    {
      id: 8,
      name: 'luisa',
      age: 33,
      hobbies: ['bailar', 'cantar'],
      skils: ['design'],
      text: 'luisa 33 bailar cantar design',
      vector: {'indices': [4262050920, 1265401351, 2819574740, 1568472017, 1598346136], 'values': [0.24438847590910515, 0.13330403742903935, 0.2673406598302815, 0.2732092663274274, 0.0817575605041466]}
    },
    {
      id: 9,
      name: 'daniel',
      age: 40,
      hobbies: ['jugar tenis', 'leer'],
      skils: ['marketing'],
      text: 'daniel 40 jugar tenis leer marketing',
      vector: {'indices': [3771632196, 2510335750, 1434444387, 888444509, 3377006606, 1690623792], 'values': [0.12984157648807326, 0.08827143393881168, 0.23336687455734592, 0.25146469484461675, 0.216548836135377, 0.08050658403577542]}
    },
    {
      id: 10,
      name: 'sofia',
      age: 26,
      hobbies: ['tocar piano', 'ver peliculas'],
      skils: ['development'],
      text: 'sofia 26 tocar piano ver peliculas development',
      vector: {'indices': [511085892, 494070171, 3823906332, 4161025236, 3964372239, 71709443, 659326392], 'values': [0.14593808871460331, 0.0869772256547726, 0.21386763723476301, 0.11779194376693035, 0.15223032482353852, 0.2255073139813322, 0.05768746582406006]}
    },
  ];
// create_collection(data).then()
// client.scroll(collection_name).then(({ points }) => console.log(points))
search('').then(data => console.log(data))