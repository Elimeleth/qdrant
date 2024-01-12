const { default: axios } = require("axios")

const embeddings = {
    embedQuery: async (text) => (await axios.get(`http://localhost:8030/sparse/${text}`)).data,
    embedDocuments: async (texts) => {
        const embeddings = [];

        for (const text of texts) {
            embeddings.push((await axios.get(`http://localhost:8030/sparse/${text}`)).data)
        }

        return embeddings
    }
}

module.exports = embeddings