# StreamLine Backend

Express + TypeScript backend API for StreamLine BPMN Process Hub.

## Tech Stack

- **Node.js 18+** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Anthropic Claude API** - AI integration
- **CORS** - Cross-origin support

## Development

### Install dependencies

```bash
npm install
```

### Configure environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
PORT=3001
NODE_ENV=development
ANTHROPIC_API_KEY=your_api_key_here
ALLOWED_ORIGINS=http://localhost:5173
```

### Start dev server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Build for production

```bash
npm run build
```

### Start production server

```bash
npm start
```

## Project Structure

```
src/
├── controllers/        # Request handlers
│   ├── chatController.ts
│   └── processController.ts
├── routes/            # API routes
│   ├── chat.ts
│   └── process.ts
├── services/          # Business logic
│   └── claudeService.ts
├── middleware/        # Express middleware
│   └── errorHandler.ts
├── models/           # Data models (future)
├── config/           # Configuration
└── index.ts          # Server entry point
```

## API Endpoints

### Health Check

```
GET /health
Response: { status: 'ok', timestamp: string }
```

### Chat

```
POST /api/chat/message
Body: {
  message: string
  sessionId?: string
  processId?: string
  includeContext?: boolean
}
Response: {
  message: ChatMessage
  sessionId: string
}

POST /api/chat/suggestions
Body: { bpmnXml: string }
Response: { suggestions: string[] }
```

### Processes

```
GET /api/processes
Query: status?, categoryId?, search?, limit?, offset?
Response: {
  processes: Process[]
  total: number
  limit: number
  offset: number
}

POST /api/processes
Body: {
  name: string
  description?: string
  bpmnXml?: string
  primaryCategoryId?: string
  tags?: string[]
}
Response: Process

GET /api/processes/:id
Response: Process

PUT /api/processes/:id
Body: Partial<Process>
Response: Process

DELETE /api/processes/:id
Response: 204 No Content
```

## Services

### Claude Service

Handles all interactions with the Anthropic Claude API.

**Methods:**
- `sendMessage(request)` - Send a chat message to Claude
- `getSuggestions(bpmnXml)` - Get AI suggestions for a BPMN diagram
- `clearSession(sessionId)` - Clear chat session history

**Features:**
- Session management (keeps last 20 messages)
- Automatic session cleanup
- Context-aware responses
- BPMN-specific system prompts

## Error Handling

Custom error handler middleware provides consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Server port | No | 3001 |
| NODE_ENV | Environment (development/production) | No | development |
| ANTHROPIC_API_KEY | Anthropic API key | Yes | - |
| ALLOWED_ORIGINS | CORS allowed origins (comma-separated) | No | http://localhost:5173 |

## Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (placeholder)

## Data Storage

Current implementation uses in-memory storage for processes. For production:

- Add PostgreSQL or MongoDB for persistence
- Implement database migrations
- Add data validation layer
- Set up connection pooling

## Security

- CORS enabled with origin validation
- Environment variables for sensitive data
- Input validation in controllers
- Error messages sanitized in production

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables on your hosting platform

3. Start the server:
   ```bash
   npm start
   ```

Recommended platforms:
- AWS ECS / Fargate
- Google Cloud Run
- Railway
- Render
- Heroku

## Testing

Add tests using:
- Jest for unit tests
- Supertest for API integration tests

Example structure:
```
tests/
├── unit/
│   ├── services/
│   └── controllers/
└── integration/
    └── api/
```

## Monitoring

Recommended tools:
- Sentry for error tracking
- DataDog or New Relic for APM
- CloudWatch or similar for logs

## Contributing

1. Follow TypeScript strict mode
2. Add JSDoc comments for public methods
3. Write tests for new features
4. Update API documentation
