import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import ollama from 'ollama'
import embedChunks from './embedChunks.js';
import { ChromaClient } from "chromadb";
import { styleText } from "util"
import path from 'path';

// constants
const MODEL_NAME = "KippianScribe";                   // the AI model to be used by the Scribe AI
const USER_ROLE = "user";                             // the role that is inserted in ollama.chat()
const COLLECTION_NAME = "kippian_scribe_collection";  // the collection name in ChromaDB
const EMBEDDING_MODEL = "nomic-embed-text";           // the AI model for generating embeddings
const OLLAMA_OUTPUT_PATH =  path.resolve('content', 'chunks'); // the path where all the chunks needed for embedding will be retrieved from

yargs(hideBin(process.argv))
  .usage('$0 <ask|embed>', 'Ask the "The Scribe" anything you want to know on the Continent of Kippian.')
  .command('ask <question>', 'Ask "The Scribe" anything!', (yargs) => {
    return yargs.positional('question', {
      describe: 'The question that you want to ask "The Scribe" AI.',
      type: 'string',
      required: true
    });
  }, async (argv) => {
    // console.log(`asking the ai ${argv.question}`);
    await ask(argv);
  })

  .command('embed', 'Embed\'s the chunks under ./content/chunks using `nomic-embed-text` model.', () => {}, async (argv) => {
    // embed chunks
    await embed();
  })

  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
  })
  .showHelpOnFail(true, 'Add "--help" flag to see more details.')
  .alias('h', 'help')
  .help()
  .parse();

async function getCollection(client, name) {
  verboseLog(styleText('white', `> Getting the collection named: ${name}`));
  let collection = null;
  try {
    verboseLog(styleText('white', `> Trying to create collection named: ${name}`));
    collection = await client.createCollection({ name });
  } catch (e) {
    verboseLog(styleText('white', `> "${name}" collection cannot be created. It may have been created before.`));
    verboseLog(styleText('white', `> Retrieving collection named: "${name}"`));
    // if it fails, get the already existing collection
    collection = await client.getCollection({ name });
  }

  return collection;
}

function verboseLog(str) {
  const isVerbose = (process?.argv || []).includes('--verbose') || (process?.argv || []).includes('-v');
  if (isVerbose) {
    console.log(str);
  }
}

async function ask(argv) {
  const QUESTION = argv.question.trim();
  console.log(styleText('blue', `
                                                                            __ 
   _____             _   _                  _____                 _        |  |
  |   __|___ ___ ___| |_|_|___ ___ ___     |_   _|___ ___ _ _ ___| |___ ___|  |
  |  |  |  _| -_| -_|  _| |   | . |_ -|_     | | |  _| .'| | | -_| | -_|  _|__|
  |_____|_| |___|___|_| |_|_|_|_  |___| |    |_| |_| |__,|\\_/|___|_|___|_| |__|
                              |___|   |_|                                      
  `));

  if (!QUESTION) {
    console.log(styleText('red', 'Alas! I cannot give what you didn\'t ask. Provide `--ask` flag and ask your question.'));
    process.exit(1);
  }

  console.log(styleText('blue', `You have asked: "${QUESTION}". I remember writing it somewhere, hold on a minute...`));

  // connect to a vector database (chromaDB)
  verboseLog(styleText('white', `> Connecting to ChromaDB with collection name \`${COLLECTION_NAME}\`...`));
  const client = new ChromaClient();
  let collection = await getCollection(client, COLLECTION_NAME);

  // generate an embedding for the input and retrieve the most relevant doc
  verboseLog(styleText('white', `> Getting information from ChromaDB`));
  const inputEmbedding = await ollama.embeddings({
    model: EMBEDDING_MODEL,
    prompt: QUESTION
  });
  const results = await collection.query({
    queryEmbeddings: [inputEmbedding.embedding],
    nResults: 1
  });
  const userAsks = results['documents'][0][0]

  // ask our scribe what has being asked.
  verboseLog(styleText('white', `> Asking the "${MODEL_NAME}" now.`));
  const response = await ollama.chat({
    model: MODEL_NAME,
    messages: [
      { role: USER_ROLE, content: `Using this data: ${userAsks}. Respond to this prompt: ${QUESTION}` }
    ],
  })
  console.log(styleText('green', `Got it!${response.message.content}`));
}

async function embed() {
  verboseLog(styleText('white', `> Deleting the collection's data first.`));
  const client = new ChromaClient();
  try {
    await client.deleteCollection({name: COLLECTION_NAME}); // delete all existing data, as we will be updating the embeddings.
  } catch(error) {
    // it's okay if the resource has already been deleted. 
  }

  verboseLog(styleText('white', `> Creating or getting the collection from ChromaDB.`));
  let collection = await getCollection(client, COLLECTION_NAME);
  
  // get embeddings of the provided chunks, then save it to chromaDB
  verboseLog(styleText('white', `> Starting to embed chunks from: "${OLLAMA_OUTPUT_PATH}"`));
  await embedChunks(ollama, collection, EMBEDDING_MODEL, OLLAMA_OUTPUT_PATH);
  verboseLog(styleText('white', `> Done embedding.`));
}
