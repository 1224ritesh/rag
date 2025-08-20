# AI Document Assistant

A Next.js RAG (Retrieval-Augmented Generation) application that allows users to upload documents and chat with their content.

🚀 **Demo URLS**: [https://rag-ritesh-sharmas-projects-5afba6d3.vercel.app/](https://rag-ritesh-sharmas-projects-5afba6d3.vercel.app/) , [https://rag-nine-rho.vercel.app/](https://rag-nine-rho.vercel.app/)

## Features

- 📁 **Document Upload**: Support for PDF, TXT, MD files (max 5MB per file)
- 📝 **Text Input**: Direct text content ingestion
- 🤖 **AI Chat**: Ask questions about your uploaded content
- 🔍 **Vector Search**: Powered by Qdrant vector database
- ⚡ **Real-time Processing**: Instant document processing and chunking
- 📱 **Responsive UI**: Modern gradient design with drag-and-drop support

## Tech Stack

- **Frontend**: Next.js 15.5, React 19, Tailwind CSS 4
- **AI**: Google Gemini (Chat & Embeddings)
- **Vector DB**: Qdrant
- **Document Processing**: LangChain, pdf-parse
- **Build Tool**: Turbopack

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.js      # Chat API endpoint
│   │   └── ingest/route.js    # Document ingestion API
│   ├── components/
│   │   ├── ChatPanel.jsx      # Chat interface
│   │   ├── DataIngest.jsx     # Document upload interface
│   │   └── UploadButton.jsx   # File upload component
│   ├── globals.css
│   ├── layout.js
│   └── page.js               # Main page
└── lib/
    ├── embeddings.js         # Google Gemini embeddings
    ├── loaders.js           # Document loaders
    ├── qdrant.js            # Qdrant vector store
    └── rag.js               # RAG implementation
```

## Environment Variables

Create a `.env.local` file with:

```env
GOOGLE_API_KEY=your_google_api_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=rag_collection
GEMINI_CHAT_MODEL=gemini-1.5-pro
GEMINI_EMBED_MODEL=gemini-embedding-001
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Upload Documents**: Use the Knowledge Base panel to upload files or add text
2. **Chat**: Ask questions about your content in the AI Assistant panel
3. **Get Answers**: Receive contextual responses with source citations

## API Endpoints

- `POST /api/ingest` - Process and store documents
- `POST /api/chat` - Chat with your documents

## Key Dependencies

- `@google/generative-ai` - Google Gemini AI
- `@langchain/google-genai` - LangChain Google integration
- `@langchain/qdrant` - Qdrant vector store
- `@qdrant/js-client-rest` - Qdrant client
- `pdf-parse` - PDF document parsing
- `cheerio` - Web scraping support
