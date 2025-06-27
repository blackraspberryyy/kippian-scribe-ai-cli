# Kippian Scribe AI for Ollama

## Prerequisites
1. Windows OS (just because this is what I use).
2. Docker (with ChromaDB image)
    - To pull chromaDB from dockerhub, just run `docker pull chromaDB/chroma`.
3. Ollama (with Mistral)
    - Once you have access to ollama, go to terminal. Then make sure your working directory is at "this" project folder (`path/to/kippian-scribe-ai-ollama`) to ensure it will use the `Modelfile`. Then type `ollama create KippianScribe`. This will create the `KippianScribe` and is based on `mistral` LLM (see `Modelfile`).
    
    If you have an error that says you need to pull `mistral` or `nomic-embed-text`, just pull it. Type `ollama pull mistral|nomic-embed-text`.

## Get Started
1. Run your ollama (if you haven't already): `ollama serve`.
If it throws error saying `Error: listen tcp 127.0.0.1:11434: bind: Only one usage of each socket address (protocol/network address/port) is normally permitted.`, then it means you already ran ollama.

2. Run your chromaDB: `docker run -p 8000:8000 chromadb/chroma`.

3. Finally, ask your question! `node index.js ask "what do you know about Kippian?"`.

## TODO:
1. further improve the data fed to AI. Right now it's a cluster-F so AI really can't discern related terms.
2. Bug. I need to always embed before getting a result from the model. It should work without embedding.