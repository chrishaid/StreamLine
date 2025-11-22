# StreamLine Frontend

React + TypeScript + Vite frontend for StreamLine BPMN Process Hub.

## Tech Stack

- **React 18+** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **bpmn-js** - BPMN 2.0 rendering and editing
- **Zustand** - State management
- **React Router** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icon library

## Development

### Install dependencies

```bash
npm install
```

### Start dev server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── layout/         # Layout components
│   ├── bpmn/           # BPMN viewer/modeler
│   ├── chat/           # Chat interface
│   └── common/         # Shared components
├── pages/              # Page components
├── store/              # Zustand stores
├── types/              # TypeScript types
├── services/           # API services
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Key Components

### Layout Components

- `Header` - Top navigation bar with search
- `Sidebar` - Left sidebar with navigation
- `MainLayout` - Main layout wrapper

### BPMN Components

- `BPMNViewer` - Read-only BPMN diagram viewer
- `BPMNModeler` - Interactive BPMN diagram editor

### Chat Components

- `ChatPanel` - Chat interface for Claude AI

### Pages

- `HomePage` - Landing page with dashboard
- `EditorPage` - BPMN editor page

## State Management

Uses Zustand for global state management. Main store: `useAppStore`

State includes:
- UI state (sidebar, chat panel, active view)
- Processes and categories
- BPMN editor state
- Chat messages
- Loading states

## Styling

Tailwind CSS with custom configuration:
- Custom color palette
- Responsive design
- Dark mode support (planned)

## Environment Variables

Create `.env` file in frontend directory:

```env
VITE_API_URL=http://localhost:3001
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
