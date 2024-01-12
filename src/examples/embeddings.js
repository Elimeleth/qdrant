const embeddings = require("../embedding");

embeddings.embedQuery('foo').then(vector => console.log(vector))