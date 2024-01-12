const { vectorStore } = require("../retriever");

/*

shoes es un array y el dataset que use para este repositorio, puedes usarlo de igual manera

*/
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

const main = async () => {
    // await vectorStore.addDocuments(shoes) Asi podemos pasar un array para construir nuestro dataSet
    
    const retriever = vectorStore.asRetriever(1)
    const retrieverPipe = retriever.pipe(formatDocumentsAsString)
    
    const data1 = await retrieverPipe.invoke('Nike air max')
    console.log(data1) // id 1 Niker Air Max ... 

    const vector = await embeddings.embedQuery('Nike Air Max')
    console.log(vector) // { indices: number[], values: number[] }

    const data2 = await vectorStore.similaritySearchVectorWithScore(vector, 2)
    console.log(data2) // { points: documents[] }

    const data3 = await vectorStore.similaritySearch('Nike Air Max') // A diferencia del metodo anterior, este internamete construye el embedding
    console.log(data3) // { points: documents[] }

    const { points } = await vectorStore.scroll() // Es un get de nuestros datos
    console.log(points.map(point => point.payload))


    const documents = await retriever.getRelevantDocuments('Nike Air Max 90')
    console.log(documents) // Nos muestra los documentos relevantes a nuestra busqueda
}

main().then()