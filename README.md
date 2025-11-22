# StreamLine

StreamLine is a single-page application that serves as the single source of truth for organizational process diagrams. It combines Claude AI's natural language processing with bpmn-js visual modeling to enable conversational process creation, intelligent editing, hierarchical organization, and version control.

## Key Value Propositions

1. **Conversational Process Modeling** - Create BPMN diagrams through natural language chat with Claude
2. **Hybrid Editing** - Switch seamlessly between AI-assisted chat and direct visual editing
3. **Organizational Memory** - Centralized repository with hierarchical tagging and search
4. **Version Control** - Track changes, compare versions, and restore previous states
5. **AI-Powered Improvements** - Get intelligent suggestions for process optimization

## Product Vision

Transform business process documentation from a static, technical activity into a collaborative, AI-assisted conversation that produces living, version-controlled diagrams accessible across the organization.

## Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** - Build tool and dev server
- **bpmn-js** - BPMN 2.0 rendering and editing
- **Zustand** - State management
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Node.js** with Express
- **TypeScript** - Type safety
- **Anthropic Claude API** - AI-powered chat
- **CORS** - Cross-origin resource sharing

## Project Structure

```
StreamLine/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── layout/      # Layout components (Header, Sidebar, MainLayout)
│   │   │   ├── bpmn/        # BPMN viewer and modeler components
│   │   │   ├── chat/        # Chat interface components
│   │   │   └── common/      # Shared components
│   │   ├── pages/           # Page components (Home, Editor)
│   │   ├── store/           # Zustand state management
│   │   ├── types/           # TypeScript type definitions
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx          # Main App component
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles (Tailwind)
│   ├── public/              # Static assets
│   ├── package.json
│   └── vite.config.ts       # Vite configuration
│
├── backend/                 # Express backend API
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (Claude service)
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Data models (future: database)
│   │   ├── config/          # Configuration
│   │   └── index.ts         # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example         # Environment variables template
│
└── shared/                  # Shared code between frontend and backend
    └── types/               # Shared TypeScript types
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Anthropic API Key** - Get one from [Anthropic Console](https://console.anthropic.com/)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd StreamLine
```

2. **Install frontend dependencies**

```bash
cd frontend
npm install
```

3. **Install backend dependencies**

```bash
cd ../backend
npm install
```

4. **Configure environment variables**

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```env
PORT=3001
NODE_ENV=development
ANTHROPIC_API_KEY=your_api_key_here
ALLOWED_ORIGINS=http://localhost:5173
```

### Running the Application

#### Development Mode

1. **Start the backend server** (from `backend/` directory):

```bash
npm run dev
```

The backend will start on `http://localhost:3001`

2. **Start the frontend dev server** (from `frontend/` directory):

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

#### Production Build

1. **Build the frontend**:

```bash
cd frontend
npm run build
```

2. **Build the backend**:

```bash
cd backend
npm run build
```

3. **Start the production server**:

```bash
cd backend
npm start
```

## Features

### Phase 1: MVP (Current)

- ✅ User Interface with Header, Sidebar, and main canvas
- ✅ Chat interface with Claude AI
- ✅ BPMN Viewer component using bpmn-js
- ✅ BPMN Modeler component for editing
- ✅ Toggle between View and Edit modes
- ✅ Zoom controls and diagram navigation
- ✅ Export diagrams as SVG
- ✅ Backend API structure
- ✅ Claude API integration for chat
- 🚧 Create BPMN diagrams via chat (in progress)
- 🚧 Save and load processes (in progress)
- 🚧 Basic file management (in progress)

### Phase 2: Organization & Discovery (Planned)

- Hierarchical category tree
- Multi-tagging
- Search with filters
- Favorites and recent views
- Process metadata management

### Phase 3: Version Control (Planned)

- Visual diff comparison
- AI-generated change summaries
- Restore previous versions
- Version branching

### Phase 4: AI Enhancements (Planned)

- AI improvement suggestions
- Process analysis
- Smart templates
- Auto-completion

## API Documentation

### Backend API Endpoints

#### Health Check
```
GET /health
```

#### Chat Endpoints
```
POST /api/chat/message
Body: {
  message: string
  sessionId?: string
  processId?: string
  includeContext?: boolean
}

POST /api/chat/suggestions
Body: {
  bpmnXml: string
}
```

#### Process Endpoints
```
GET    /api/processes
POST   /api/processes
GET    /api/processes/:id
PUT    /api/processes/:id
DELETE /api/processes/:id
```

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code linting
- Prettier for code formatting (recommended)

### Adding New Features

1. Create feature branch: `git checkout -b feature/your-feature-name`
2. Implement changes
3. Test thoroughly
4. Create pull request

## Troubleshooting

### Frontend won't start

- Ensure Node.js 18+ is installed
- Delete `node_modules` and `package-lock.json`, then run `npm install`
- Check for port conflicts (default: 5173)

### Backend won't start

- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check backend port is available (default: 3001)
- Check backend logs for errors

### BPMN diagrams not rendering

- Check browser console for errors
- Ensure bpmn-js dependencies are installed
- Verify BPMN XML is valid

### Chat not responding

- Verify Anthropic API key is valid
- Check backend logs for API errors
- Ensure backend is running and reachable

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

ISC

## Support

For issues and questions, please open a GitHub issue.

## Roadmap

See the [PRD document](./docs/PRD.md) for the complete product roadmap and future features.
