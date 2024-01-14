import embeddings from "../embedding";

const vector = await embeddings.embedQuery('foo')

console.log(vector)