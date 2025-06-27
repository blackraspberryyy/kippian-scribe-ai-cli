import path from 'path';
import fs, { readFile } from 'fs';

async function embedChunks(ollama, collection, embeddingModel, outputPath) {
  // get all chunks
  const chunks = fs.readdirSync(outputPath).sort();

  // get embeddings of each chunks
  const chunkData = chunks.map(fileName => {
    const fileData = fs.readFileSync(path.resolve(outputPath, fileName), {encoding: 'utf-8'});
    return {fileName, fileData};
  });

  let documents = [];
  let ids = [];
  let embeddings = [];
  let index = 0;
  for (const chunk of chunkData) {
    const embeddingResponse = await ollama.embeddings({
      model: embeddingModel,
      prompt: chunk.fileData
    });

    documents.push(chunk.fileData);
    ids.push(`${index}`);
    embeddings.push(embeddingResponse.embedding);
    index += 1;
  }

  // save those embeddings to chromeDB
  await collection.add({
    documents,
    ids,
    embeddings
  });

  return;
}

export default embedChunks