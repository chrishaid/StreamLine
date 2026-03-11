// Tutorial Steps for Spotlight Tutorial
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  image?: string;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to StreamLine',
    description:
      'Your AI-powered BPMN process hub for documenting and improving business processes. Let\'s take a quick tour of the key features!',
    position: 'center',
    image: '/help/01-process-library-main.png',
  },
  {
    id: 'sidebar',
    title: 'Navigate Your Processes',
    description:
      'Use the sidebar to browse all processes, view recent work, access favorites, and manage tags. Everything you need is just a click away.',
    target: '[data-tutorial="sidebar"]',
    position: 'right',
  },
  {
    id: 'new-process',
    title: 'Create New Processes',
    description:
      'Click "New Process" to start modeling a business process from scratch, or upload an existing BPMN file to continue your work.',
    target: '[data-tutorial="new-process"]',
    position: 'right',
  },
  {
    id: 'process-cards',
    title: 'Your Process Library',
    description:
      'Each card shows a preview of your diagram with tags, status, and quick actions. Click to open, duplicate, or manage any process.',
    target: '[data-tutorial="process-card"]',
    position: 'bottom',
  },
  {
    id: 'chat',
    title: 'AI Assistant in Editor',
    description:
      'When editing a process, look for the "AI Chat" button in the bottom right corner. Claude can help you create BPMN diagrams from descriptions, analyze your processes, and suggest improvements based on best practices.',
    position: 'center',
  },
  {
    id: 'help',
    title: 'Get Help Anytime',
    description:
      'Access the visual guide, restart this tour, or get BPMN reference materials from the help menu. You\'re all set to start modeling!',
    target: '[data-tutorial="help-menu"]',
    position: 'bottom',
  },
];

// Help Sections for Help Page and Help Drawer
export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  content: string;
  image?: string;
  keyPoints?: string[];
}

export const helpSections: HelpSection[] = [
  {
    id: 'process-library',
    title: 'Process Library Overview',
    icon: 'FolderOpen',
    description: 'Your central hub for managing all business processes',
    image: '/help/01-process-library-main.png',
    content: `The Process Library is your home dashboard where all your BPMN processes are organized and accessible.`,
    keyPoints: [
      'Left sidebar provides quick navigation to All Processes, Recent, and Favorites',
      'Filter processes by tags to find related workflows quickly',
      'Each process card shows a thumbnail preview, tags, and engagement metrics',
      'Use the search bar in the header to find any process instantly',
      'Star important processes to add them to your Favorites',
    ],
  },
  {
    id: 'creating-processes',
    title: 'Creating New Processes',
    icon: 'Plus',
    description: 'Start modeling from scratch or upload existing BPMN files',
    image: '/help/09-blank-canvas-details.png',
    content: `Creating a new process in StreamLine gives you a blank BPMN canvas with all the tools you need.`,
    keyPoints: [
      'Click "New Process" in the sidebar to start fresh',
      'Fill in process name, description, and tags before building',
      'Use the left palette to drag BPMN elements onto the canvas',
      'A Start Event is automatically placed as your starting point',
      'Upload existing .bpmn files to continue work from other tools',
    ],
  },
  {
    id: 'editing-processes',
    title: 'Editing Complex Processes',
    icon: 'Edit3',
    description: 'Work with swimlanes, gateways, and multi-step workflows',
    image: '/help/05-aees-process-full.png',
    content: `Complex processes in StreamLine support all BPMN 2.0 elements including pools, lanes, and advanced gateways.`,
    keyPoints: [
      'Use swimlanes to show responsibilities across different roles or departments',
      'Add gateways (diamonds) to represent decision points and parallel flows',
      'Connect elements with sequence flows by dragging from one to another',
      'Add annotations to explain complex decision logic',
      'Use message flows (dashed lines) for communication between pools',
    ],
  },
  {
    id: 'editor-toolbar',
    title: 'Editor Toolbar & Tools',
    icon: 'Wrench',
    description: 'Master the BPMN editing interface',
    image: '/help/06-editor-toolbar.png',
    content: `The editor provides a full suite of BPMN 2.0 modeling tools organized in an intuitive left-side palette.`,
    keyPoints: [
      'Hand tool for panning around the canvas',
      'Selection tool to click and select elements',
      'Connector tool to draw sequence flows between elements',
      'Event icons (circles) for start, end, and intermediate events',
      'Gateway icons (diamonds) for exclusive, parallel, and inclusive decisions',
      'Task icons (rectangles) for activities and subprocesses',
    ],
  },
  {
    id: 'element-properties',
    title: 'Element Properties',
    icon: 'Settings',
    description: 'Configure and customize BPMN elements',
    image: '/help/07-element-selected.png',
    content: `When you select an element, quick action icons appear for common operations.`,
    keyPoints: [
      'Click an element to see selection handles and quick actions',
      'Use the small icons to change element type or add connected elements',
      'Double-click to edit the element label directly',
      'Right-click for additional options like copy, paste, and delete',
      'Drag connection points to create new sequence flows',
    ],
  },
  {
    id: 'process-management',
    title: 'Process Management',
    icon: 'Folders',
    description: 'Organize, filter, and manage your process library',
    image: '/help/08-process-library-filters.png',
    content: `Keep your process library organized with tags, filters, and quick actions.`,
    keyPoints: [
      'Use "Open Process" to view or edit any process',
      'Duplicate processes to create variants or new versions',
      'Copy processes to different workspaces or organizations',
      'Filter by tags to show only related processes',
      'Track status (Draft, Active, Archived) for each process',
    ],
  },
  {
    id: 'best-practices',
    title: 'BPMN Best Practices',
    icon: 'Award',
    description: 'Create professional, standards-compliant diagrams',
    content: `Follow these Camunda-aligned best practices for clear, maintainable process diagrams.`,
    keyPoints: [
      'Flow left to right with swimlanes horizontal',
      'Use active verbs for tasks: "Process Payment", not "Processing"',
      'Frame gateways as questions: "Payment Approved?"',
      'Always show error paths, not just the happy path',
      'Use subprocesses to break up complex diagrams',
      'Add annotations to explain non-obvious decisions',
      'Label all gateway outcomes clearly (Yes/No, Approved/Rejected)',
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    icon: 'Keyboard',
    description: 'Speed up your workflow with keyboard commands',
    content: `StreamLine supports standard keyboard shortcuts for efficient modeling.`,
    keyPoints: [
      'Delete - Remove selected element',
      'F2 - Edit label of selected element',
      'Ctrl/Cmd + Z - Undo last action',
      'Ctrl/Cmd + Y - Redo action',
      'Ctrl/Cmd + S - Save process',
      'Ctrl/Cmd + 0 - Fit diagram to screen',
      '+ / - - Zoom in/out',
      'Space + drag - Pan around canvas',
    ],
  },
  {
    id: 'faq',
    title: 'Common Questions',
    icon: 'HelpCircle',
    description: 'Answers to frequently asked questions',
    content: `Quick answers to common BPMN modeling questions.`,
    keyPoints: [
      'Parallel tasks: Use a Parallel (AND) Gateway to split into simultaneous paths',
      'Optional steps: Use an Inclusive (OR) Gateway for paths that may or may not execute',
      'Decisions: Use an Exclusive (XOR) Gateway where only ONE path executes',
      'Organize responsibilities: Create swimlanes within a pool for each role',
      'Handle errors: Attach an Error Event to tasks for exception paths',
      'Show waiting: Use Timer Events for delays or timeouts',
      'Reduce complexity: Use Subprocesses to group related tasks',
    ],
  },
];

// Quick tips that can be shown contextually
export const quickTips = [
  {
    id: 'naming',
    title: 'Naming Tasks',
    tip: 'Use active verbs: "Review Application" not "Application Review"',
  },
  {
    id: 'gateways',
    title: 'Gateway Labels',
    tip: 'Frame as questions: "Is order valid?" with Yes/No paths',
  },
  {
    id: 'swimlanes',
    title: 'Using Swimlanes',
    tip: 'One lane per role or department - shows who does what',
  },
  {
    id: 'subprocesses',
    title: 'When to Subprocess',
    tip: 'If a section has 5+ related tasks, consider grouping them',
  },
  {
    id: 'annotations',
    title: 'Adding Context',
    tip: 'Use text annotations to explain complex gateway logic',
  },
];
