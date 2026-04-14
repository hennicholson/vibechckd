export type Specialty = "frontend" | "backend" | "security" | "automation" | "full-stack";

export const SPECIALTIES: Specialty[] = ["frontend", "backend", "security", "automation", "full-stack"];

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  frontend: "Frontend",
  backend: "Backend",
  security: "Security",
  automation: "Automation",
  "full-stack": "Full Stack",
};

export const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  ...SPECIALTIES.map((s) => ({ value: s, label: SPECIALTY_LABELS[s] })),
];

export type PortfolioAsset = {
  id: string;
  type: "pdf" | "image" | "video" | "live_preview" | "figma";
  title: string;
  url: string;
  thumbnailUrl?: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  assets: PortfolioAsset[];
};

export type Coder = {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string;
  gifPreviewUrl: string;
  bio: string;
  tagline: string;
  location: string;
  websiteUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  title: string;
  specialties: Specialty[];
  yearsExperience: number;
  availability: "available" | "selective" | "unavailable";
  hourlyRate: string;
  skills: string[];
  tools: string[];
  verified: boolean;
  featured: boolean;
  joinedAt: string;
  portfolio: PortfolioItem[];
};

export const coders: Coder[] = [
  {
    id: "1",
    slug: "sara-chen",
    displayName: "Sara Chen",
    avatarUrl: "/pfp/sara.jpeg",
    gifPreviewUrl: "/previews/sara.gif",
    bio: "I design and build digital experiences that feel like they belong in the world. Previously at Vercel and Stripe, now independent. I believe the best interfaces are the ones you don't notice — they just work, beautifully.",
    tagline: "Interfaces that feel inevitable",
    location: "San Francisco, CA",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com",
    twitterUrl: "https://twitter.com",
    title: "Creative Developer",
    specialties: ["frontend"],
    yearsExperience: 8,
    availability: "selective",
    hourlyRate: "$200-350/hr",
    skills: ["React", "Three.js", "Framer Motion", "TypeScript", "WebGL"],
    tools: ["Cursor", "Figma", "Claude", "v0"],
    verified: true,
    featured: true,
    joinedAt: "2024-01-15",
    portfolio: [
      {
        id: "pi-1",
        title: "Lumina Design Portfolio",
        description: "A photographer's portfolio with WebGL transitions and dynamic grid layouts.",
        thumbnailUrl: "/portfolio/lumina-thumb.jpg",
        assets: [
          { id: "a1", type: "live_preview", title: "Live Site", url: "https://www.awwwards.com/sites/hello-monday" },
          { id: "a2", type: "image", title: "Homepage Mockup", url: "/portfolio/lumina-mockup.png" },
          { id: "a3", type: "pdf", title: "Case Study Deck", url: "/portfolio/lumina-deck.pdf" },
        ],
      },
      {
        id: "pi-2",
        title: "Ambient Weather App",
        description: "Weather visualization that changes the entire UI based on conditions.",
        thumbnailUrl: "/portfolio/weather-thumb.jpg",
        assets: [
          { id: "a4", type: "live_preview", title: "Live Preview", url: "https://weather.com" },
          { id: "a5", type: "image", title: "Design System", url: "/portfolio/weather-system.png" },
        ],
      },
      {
        id: "pi-3",
        title: "Motion Library",
        description: "Open-source React animation primitives built on Framer Motion.",
        thumbnailUrl: "/portfolio/motion-thumb.jpg",
        assets: [
          { id: "a6", type: "live_preview", title: "Docs Site", url: "https://framer.com/motion" },
          { id: "a7", type: "image", title: "Component Showcase", url: "/portfolio/motion-showcase.png" },
        ],
      },
    ],
  },
  {
    id: "2",
    slug: "marcus-johnson",
    displayName: "Marcus Johnson",
    avatarUrl: "/pfp/marcus.jpeg",
    gifPreviewUrl: "/previews/marcus.gif",
    bio: "Full-stack builder obsessed with performance and polish. I ship fast without cutting corners. Every animation, every transition, every loading state — it all matters.",
    tagline: "Ship fast, ship beautiful",
    location: "Brooklyn, NY",
    githubUrl: "https://github.com",
    twitterUrl: "https://twitter.com",
    linkedinUrl: "https://linkedin.com",
    title: "Full-Stack Engineer",
    specialties: ["full-stack"],
    yearsExperience: 6,
    availability: "available",
    hourlyRate: "$150-250/hr",
    skills: ["Next.js", "Node.js", "PostgreSQL", "Tailwind CSS", "Redis"],
    tools: ["Claude", "Cursor", "Linear", "Vercel"],
    verified: true,
    featured: true,
    joinedAt: "2024-02-01",
    portfolio: [
      {
        id: "pi-4",
        title: "Pulse Analytics Dashboard",
        description: "Real-time analytics dashboard with live-updating charts and metrics.",
        thumbnailUrl: "/portfolio/pulse-thumb.jpg",
        assets: [
          { id: "a8", type: "live_preview", title: "Live Dashboard", url: "https://vercel.com" },
          { id: "a9", type: "pdf", title: "Architecture Doc", url: "/portfolio/pulse-arch.pdf" },
          { id: "a10", type: "image", title: "Chart Components", url: "/portfolio/pulse-charts.png" },
        ],
      },
      {
        id: "pi-5",
        title: "TaskFlow Project Manager",
        description: "Kanban-style project management with drag-and-drop and real-time sync.",
        thumbnailUrl: "/portfolio/taskflow-thumb.jpg",
        assets: [
          { id: "a11", type: "live_preview", title: "App Demo", url: "https://linear.app" },
          { id: "a12", type: "image", title: "Board View", url: "/portfolio/taskflow-board.png" },
        ],
      },
      {
        id: "pi-6",
        title: "Velocity CLI",
        description: "Developer CLI for scaffolding full-stack Next.js projects with best practices.",
        thumbnailUrl: "/portfolio/velocity-thumb.jpg",
        assets: [
          { id: "a13", type: "image", title: "Terminal Output", url: "/portfolio/velocity-terminal.png" },
          { id: "a14", type: "pdf", title: "README", url: "/portfolio/velocity-readme.pdf" },
        ],
      },
    ],
  },
  {
    id: "3",
    slug: "aya-patel",
    displayName: "Aya Patel",
    avatarUrl: "/pfp/aya.jpeg",
    gifPreviewUrl: "/previews/aya.gif",
    bio: "I make the web feel alive. Creative coding meets production-grade engineering. Currently exploring the intersection of generative art and functional interfaces.",
    tagline: "Making the web feel alive",
    location: "London, UK",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com",
    title: "Creative Technologist",
    specialties: ["frontend"],
    yearsExperience: 5,
    availability: "available",
    hourlyRate: "$120-200/hr",
    skills: ["p5.js", "GLSL", "React", "Svelte", "D3.js"],
    tools: ["Claude", "TouchDesigner", "Blender"],
    verified: true,
    featured: false,
    joinedAt: "2024-02-20",
    portfolio: [
      {
        id: "pi-7",
        title: "Generative Landscapes",
        description: "Interactive generative art that responds to mouse movement and audio input.",
        thumbnailUrl: "/portfolio/gen-thumb.jpg",
        assets: [
          { id: "a15", type: "live_preview", title: "Interactive Demo", url: "https://p5js.org" },
          { id: "a16", type: "video", title: "Demo Reel", url: "/portfolio/gen-reel.mp4" },
        ],
      },
      {
        id: "pi-8",
        title: "Data Sonification",
        description: "Turning climate data into ambient soundscapes using Web Audio API.",
        thumbnailUrl: "/portfolio/sonify-thumb.jpg",
        assets: [
          { id: "a17", type: "live_preview", title: "Listen", url: "https://example.com" },
          { id: "a18", type: "image", title: "Waveform Visualization", url: "/portfolio/sonify-wave.png" },
        ],
      },
      {
        id: "pi-9",
        title: "Particle Garden",
        description: "WebGL particle system with 100k+ particles responding to physics simulation.",
        thumbnailUrl: "/portfolio/particles-thumb.jpg",
        assets: [
          { id: "a19", type: "live_preview", title: "Run Simulation", url: "https://example.com" },
        ],
      },
    ],
  },
  {
    id: "4",
    slug: "jake-morris",
    displayName: "Jake Morris",
    avatarUrl: "/pfp/jake.jpeg",
    gifPreviewUrl: "/previews/jake.gif",
    bio: "Design engineer who thinks in systems. I build component libraries, design tokens, and the infrastructure that makes great UI possible at scale.",
    tagline: "Design systems at scale",
    location: "Austin, TX",
    websiteUrl: "https://example.com",
    linkedinUrl: "https://linkedin.com",
    title: "Design Engineer",
    specialties: ["frontend", "full-stack"],
    yearsExperience: 7,
    availability: "unavailable",
    hourlyRate: "$180-280/hr",
    skills: ["Design Systems", "React", "Storybook", "Figma API", "CSS"],
    tools: ["Figma", "Storybook", "Chromatic", "v0"],
    verified: true,
    featured: true,
    joinedAt: "2024-03-05",
    portfolio: [
      {
        id: "pi-10",
        title: "Pollen Design System",
        description: "A comprehensive design system with 60+ components and full Figma integration.",
        thumbnailUrl: "/portfolio/pollen-thumb.jpg",
        assets: [
          { id: "a20", type: "live_preview", title: "Storybook", url: "https://ui.shadcn.com" },
          { id: "a21", type: "figma", title: "Figma Library", url: "https://figma.com" },
          { id: "a22", type: "pdf", title: "Component Spec", url: "/portfolio/pollen-spec.pdf" },
          { id: "a23", type: "image", title: "Token Overview", url: "/portfolio/pollen-tokens.png" },
        ],
      },
      {
        id: "pi-11",
        title: "Chromatic Theming Engine",
        description: "Dynamic theme generation system supporting dark mode, brand customization, and accessibility.",
        thumbnailUrl: "/portfolio/chromatic-thumb.jpg",
        assets: [
          { id: "a24", type: "live_preview", title: "Theme Playground", url: "https://example.com" },
          { id: "a25", type: "pdf", title: "Technical Writeup", url: "/portfolio/chromatic-doc.pdf" },
        ],
      },
    ],
  },
  {
    id: "5",
    slug: "lina-wu",
    displayName: "Lina Wu",
    avatarUrl: "/pfp/lina.jpeg",
    gifPreviewUrl: "/previews/lina.gif",
    bio: "I turn complex data into clear, beautiful dashboards. Background in data viz and information design. If your users need to understand something complex, I can make it click.",
    tagline: "Clarity through visualization",
    location: "Toronto, CA",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com",
    twitterUrl: "https://twitter.com",
    title: "Data Visualization Engineer",
    specialties: ["frontend"],
    yearsExperience: 4,
    availability: "available",
    hourlyRate: "$110-180/hr",
    skills: ["D3.js", "Observable", "React", "Python", "MapboxGL"],
    tools: ["Claude", "Observable", "Figma"],
    verified: true,
    featured: false,
    joinedAt: "2024-03-15",
    portfolio: [
      {
        id: "pi-12",
        title: "Climate Data Explorer",
        description: "Interactive visualization of 50 years of global temperature data.",
        thumbnailUrl: "/portfolio/climate-thumb.jpg",
        assets: [
          { id: "a26", type: "live_preview", title: "Explore Data", url: "https://observablehq.com" },
          { id: "a27", type: "image", title: "Chart Detail", url: "/portfolio/climate-chart.png" },
        ],
      },
      {
        id: "pi-13",
        title: "Urban Migration Flows",
        description: "Animated map showing population movement between US cities over 20 years.",
        thumbnailUrl: "/portfolio/migration-thumb.jpg",
        assets: [
          { id: "a28", type: "live_preview", title: "Interactive Map", url: "https://example.com" },
          { id: "a29", type: "image", title: "Flow Diagram", url: "/portfolio/migration-flow.png" },
        ],
      },
      {
        id: "pi-14",
        title: "Election Results Dashboard",
        description: "Real-time election night dashboard with precinct-level data and projections.",
        thumbnailUrl: "/portfolio/election-thumb.jpg",
        assets: [
          { id: "a30", type: "image", title: "Dashboard Screenshot", url: "/portfolio/election-dash.png" },
          { id: "a31", type: "pdf", title: "Data Architecture", url: "/portfolio/election-arch.pdf" },
        ],
      },
    ],
  },
  {
    id: "6",
    slug: "devansh-kapoor",
    displayName: "Devansh Kapoor",
    avatarUrl: "/pfp/devansh.jpeg",
    gifPreviewUrl: "/previews/devansh.gif",
    bio: "Mobile-first thinker, web-native builder. I specialize in progressive web apps and native-feeling web experiences. Animations are my love language.",
    tagline: "Native feel, web reach",
    location: "Bangalore, India",
    githubUrl: "https://github.com",
    title: "Frontend Engineer",
    specialties: ["frontend"],
    yearsExperience: 5,
    availability: "selective",
    hourlyRate: "$100-180/hr",
    skills: ["React Native", "Next.js", "Framer Motion", "PWA", "TypeScript"],
    tools: ["Cursor", "Claude", "Expo"],
    verified: true,
    featured: false,
    joinedAt: "2024-04-01",
    portfolio: [
      {
        id: "pi-15",
        title: "FitTrack PWA",
        description: "Progressive web app for fitness tracking with offline support and push notifications.",
        thumbnailUrl: "/portfolio/fittrack-thumb.jpg",
        assets: [
          { id: "a32", type: "live_preview", title: "Try It", url: "https://example.com" },
          { id: "a33", type: "image", title: "Mobile Screenshots", url: "/portfolio/fittrack-mobile.png" },
        ],
      },
      {
        id: "pi-16",
        title: "Gesture Navigation System",
        description: "Swipe-based navigation framework for mobile web applications.",
        thumbnailUrl: "/portfolio/gesture-thumb.jpg",
        assets: [
          { id: "a34", type: "video", title: "Demo Video", url: "/portfolio/gesture-demo.mp4" },
          { id: "a35", type: "image", title: "Gesture Map", url: "/portfolio/gesture-map.png" },
        ],
      },
    ],
  },
  {
    id: "7",
    slug: "emily-roth",
    displayName: "Emily Roth",
    avatarUrl: "/pfp/emily.jpeg",
    gifPreviewUrl: "/previews/emily.gif",
    bio: "E-commerce specialist who understands that conversion is design. I build storefronts that look premium and sell. Shopify, headless, custom — whatever the product needs.",
    tagline: "Commerce that converts",
    location: "Portland, OR",
    websiteUrl: "https://example.com",
    twitterUrl: "https://twitter.com",
    linkedinUrl: "https://linkedin.com",
    title: "E-Commerce Developer",
    specialties: ["full-stack"],
    yearsExperience: 6,
    availability: "available",
    hourlyRate: "$130-220/hr",
    skills: ["Shopify", "Next.js", "Stripe", "Sanity", "Tailwind CSS"],
    tools: ["Claude", "Figma", "Shopify CLI"],
    verified: true,
    featured: false,
    joinedAt: "2024-04-10",
    portfolio: [
      {
        id: "pi-17",
        title: "Artisan Coffee Roasters",
        description: "Premium e-commerce storefront with subscription management and tasting notes.",
        thumbnailUrl: "/portfolio/coffee-thumb.jpg",
        assets: [
          { id: "a36", type: "live_preview", title: "Live Store", url: "https://vercel.com/templates" },
          { id: "a37", type: "image", title: "Product Page", url: "/portfolio/coffee-product.png" },
          { id: "a38", type: "pdf", title: "Conversion Report", url: "/portfolio/coffee-report.pdf" },
        ],
      },
      {
        id: "pi-18",
        title: "Maison Collective",
        description: "Luxury fashion brand headless Shopify rebuild with 40% conversion improvement.",
        thumbnailUrl: "/portfolio/maison-thumb.jpg",
        assets: [
          { id: "a39", type: "live_preview", title: "Browse Store", url: "https://example.com" },
          { id: "a40", type: "image", title: "Lookbook Page", url: "/portfolio/maison-lookbook.png" },
        ],
      },
      {
        id: "pi-19",
        title: "Checkout Flow Optimization",
        description: "A/B tested checkout redesign reducing cart abandonment by 28%.",
        thumbnailUrl: "/portfolio/checkout-thumb.jpg",
        assets: [
          { id: "a41", type: "pdf", title: "A/B Test Results", url: "/portfolio/checkout-results.pdf" },
          { id: "a42", type: "image", title: "Flow Comparison", url: "/portfolio/checkout-flow.png" },
        ],
      },
    ],
  },
  {
    id: "8",
    slug: "tomislav-novak",
    displayName: "Tomislav Novak",
    avatarUrl: "/pfp/tomislav.jpeg",
    gifPreviewUrl: "/previews/tomislav.gif",
    bio: "Backend-minded frontend developer. I care about the architecture behind beautiful interfaces — state management, API design, caching strategies. The invisible craft.",
    tagline: "Architecture behind the pixels",
    location: "Berlin, Germany",
    githubUrl: "https://github.com",
    linkedinUrl: "https://linkedin.com",
    title: "Senior Frontend Architect",
    specialties: ["backend", "full-stack"],
    yearsExperience: 10,
    availability: "selective",
    hourlyRate: "$220-350/hr",
    skills: ["React", "GraphQL", "TypeScript", "Rust", "System Design"],
    tools: ["Neovim", "Claude", "Linear"],
    verified: true,
    featured: true,
    joinedAt: "2024-05-01",
    portfolio: [
      {
        id: "pi-20",
        title: "Nexus API Gateway",
        description: "Developer-facing dashboard for managing API keys, usage analytics, and webhooks.",
        thumbnailUrl: "/portfolio/nexus-thumb.jpg",
        assets: [
          { id: "a43", type: "live_preview", title: "Dashboard", url: "https://stripe.com/docs" },
          { id: "a44", type: "pdf", title: "Architecture Diagram", url: "/portfolio/nexus-arch.pdf" },
          { id: "a45", type: "image", title: "API Explorer", url: "/portfolio/nexus-explorer.png" },
        ],
      },
      {
        id: "pi-21",
        title: "GraphQL Federation Layer",
        description: "Unified GraphQL gateway federating 12 microservices with automatic schema stitching.",
        thumbnailUrl: "/portfolio/graphql-thumb.jpg",
        assets: [
          { id: "a46", type: "pdf", title: "Technical Spec", url: "/portfolio/graphql-spec.pdf" },
          { id: "a47", type: "image", title: "Service Map", url: "/portfolio/graphql-map.png" },
        ],
      },
    ],
  },
  {
    id: "9",
    slug: "priya-sharma",
    displayName: "Priya Sharma",
    avatarUrl: "/pfp/priya.jpeg",
    gifPreviewUrl: "/previews/priya.gif",
    bio: "AI-native builder. I integrate LLMs into products in ways that feel natural, not gimmicky. Chat interfaces, smart search, content generation — done with taste.",
    tagline: "AI that feels natural",
    location: "Seattle, WA",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com",
    twitterUrl: "https://twitter.com",
    title: "AI Product Engineer",
    specialties: ["automation", "full-stack"],
    yearsExperience: 4,
    availability: "available",
    hourlyRate: "$140-220/hr",
    skills: ["LangChain", "Next.js", "Python", "Vector DBs", "TypeScript"],
    tools: ["Claude", "Cursor", "Pinecone", "Vercel AI SDK"],
    verified: true,
    featured: false,
    joinedAt: "2024-05-15",
    portfolio: [
      {
        id: "pi-22",
        title: "Conversa AI Chat",
        description: "AI chat interface with streaming responses, context windows, and prompt templates.",
        thumbnailUrl: "/portfolio/conversa-thumb.jpg",
        assets: [
          { id: "a48", type: "live_preview", title: "Try Chat", url: "https://chat.openai.com" },
          { id: "a49", type: "image", title: "Chat UI", url: "/portfolio/conversa-ui.png" },
        ],
      },
      {
        id: "pi-23",
        title: "Semantic Search Engine",
        description: "Vector-based document search with natural language queries and relevance scoring.",
        thumbnailUrl: "/portfolio/search-thumb.jpg",
        assets: [
          { id: "a50", type: "live_preview", title: "Search Demo", url: "https://example.com" },
          { id: "a51", type: "pdf", title: "Embedding Strategy", url: "/portfolio/search-strategy.pdf" },
        ],
      },
      {
        id: "pi-24",
        title: "Content Pipeline",
        description: "Automated content generation pipeline with human-in-the-loop quality control.",
        thumbnailUrl: "/portfolio/pipeline-thumb.jpg",
        assets: [
          { id: "a52", type: "image", title: "Pipeline Diagram", url: "/portfolio/pipeline-diagram.png" },
          { id: "a53", type: "pdf", title: "Process Doc", url: "/portfolio/pipeline-doc.pdf" },
        ],
      },
    ],
  },
  {
    id: "10",
    slug: "oscar-feng",
    displayName: "Oscar Feng",
    avatarUrl: "/pfp/oscar.jpeg",
    gifPreviewUrl: "/previews/oscar.gif",
    bio: "I build tools for builders. Dev tools, CLIs, internal dashboards — the unsexy stuff that makes teams 10x more productive. Clean code, clear docs, zero friction.",
    tagline: "Tools for the toolmakers",
    location: "Vancouver, CA",
    githubUrl: "https://github.com",
    title: "Developer Tools Engineer",
    specialties: ["automation", "backend"],
    yearsExperience: 7,
    availability: "unavailable",
    hourlyRate: "$160-260/hr",
    skills: ["Go", "TypeScript", "CLI Design", "React", "Docker"],
    tools: ["Neovim", "Claude", "Warp"],
    verified: true,
    featured: false,
    joinedAt: "2024-06-01",
    portfolio: [
      {
        id: "pi-25",
        title: "DevForge CLI",
        description: "Zero-config CLI for spinning up development environments with Docker.",
        thumbnailUrl: "/portfolio/devforge-thumb.jpg",
        assets: [
          { id: "a54", type: "image", title: "Terminal Demo", url: "/portfolio/devforge-terminal.png" },
          { id: "a55", type: "pdf", title: "CLI Reference", url: "/portfolio/devforge-docs.pdf" },
        ],
      },
      {
        id: "pi-26",
        title: "Internal Ops Dashboard",
        description: "Real-time operations dashboard monitoring 200+ microservices.",
        thumbnailUrl: "/portfolio/ops-thumb.jpg",
        assets: [
          { id: "a56", type: "image", title: "Dashboard Overview", url: "/portfolio/ops-overview.png" },
          { id: "a57", type: "live_preview", title: "Demo Instance", url: "https://example.com" },
        ],
      },
    ],
  },
  {
    id: "11",
    slug: "maya-rodriguez",
    displayName: "Maya Rodriguez",
    avatarUrl: "/pfp/maya.jpeg",
    gifPreviewUrl: "/previews/maya.gif",
    bio: "Security-first engineer with a background in penetration testing and compliance. I audit codebases, harden infrastructure, and build secure-by-default architectures.",
    tagline: "Security without the friction",
    location: "Miami, FL",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com",
    linkedinUrl: "https://linkedin.com",
    title: "Security Engineer",
    specialties: ["security"],
    yearsExperience: 8,
    availability: "available",
    hourlyRate: "$200-320/hr",
    skills: ["Penetration Testing", "SOC2", "AWS Security", "OWASP", "Terraform"],
    tools: ["Burp Suite", "Claude", "Snyk", "SonarQube"],
    verified: true,
    featured: false,
    joinedAt: "2024-06-15",
    portfolio: [
      {
        id: "pi-27",
        title: "FinTech Security Audit",
        description: "Comprehensive security audit for a Series B fintech startup handling $50M+ in transactions.",
        thumbnailUrl: "/portfolio/fintech-thumb.jpg",
        assets: [
          { id: "a58", type: "pdf", title: "Audit Report (Redacted)", url: "/portfolio/fintech-audit.pdf" },
          { id: "a59", type: "image", title: "Vulnerability Map", url: "/portfolio/fintech-vulns.png" },
        ],
      },
      {
        id: "pi-28",
        title: "Zero-Trust Architecture",
        description: "Designed and implemented zero-trust network architecture for a 500-person org.",
        thumbnailUrl: "/portfolio/zerotrust-thumb.jpg",
        assets: [
          { id: "a60", type: "pdf", title: "Architecture Blueprint", url: "/portfolio/zerotrust-blueprint.pdf" },
          { id: "a61", type: "image", title: "Network Diagram", url: "/portfolio/zerotrust-diagram.png" },
        ],
      },
      {
        id: "pi-29",
        title: "SecureCI Pipeline",
        description: "Automated security scanning pipeline integrated into CI/CD with zero developer friction.",
        thumbnailUrl: "/portfolio/secureci-thumb.jpg",
        assets: [
          { id: "a62", type: "image", title: "Pipeline Flow", url: "/portfolio/secureci-flow.png" },
          { id: "a63", type: "pdf", title: "Integration Guide", url: "/portfolio/secureci-guide.pdf" },
        ],
      },
    ],
  },
  {
    id: "12",
    slug: "kai-tanaka",
    displayName: "Kai Tanaka",
    avatarUrl: "/pfp/kai.jpeg",
    gifPreviewUrl: "/previews/kai.gif",
    bio: "Backend infrastructure specialist. I design systems that scale gracefully under pressure. Distributed systems, event-driven architectures, and database optimization are my bread and butter.",
    tagline: "Infrastructure that scales itself",
    location: "Tokyo, Japan",
    githubUrl: "https://github.com",
    twitterUrl: "https://twitter.com",
    title: "Infrastructure Engineer",
    specialties: ["backend"],
    yearsExperience: 9,
    availability: "selective",
    hourlyRate: "$190-300/hr",
    skills: ["Go", "Kubernetes", "PostgreSQL", "Kafka", "gRPC"],
    tools: ["Claude", "Datadog", "Terraform", "ArgoCD"],
    verified: true,
    featured: false,
    joinedAt: "2024-07-01",
    portfolio: [
      {
        id: "pi-30",
        title: "Event-Driven Order System",
        description: "Kafka-based order processing system handling 50k orders/minute with exactly-once semantics.",
        thumbnailUrl: "/portfolio/orders-thumb.jpg",
        assets: [
          { id: "a64", type: "pdf", title: "System Design Doc", url: "/portfolio/orders-design.pdf" },
          { id: "a65", type: "image", title: "Architecture Diagram", url: "/portfolio/orders-arch.png" },
        ],
      },
      {
        id: "pi-31",
        title: "Multi-Region Database",
        description: "CockroachDB deployment across 3 regions with automatic failover and conflict resolution.",
        thumbnailUrl: "/portfolio/multidb-thumb.jpg",
        assets: [
          { id: "a66", type: "image", title: "Region Map", url: "/portfolio/multidb-regions.png" },
          { id: "a67", type: "pdf", title: "Runbook", url: "/portfolio/multidb-runbook.pdf" },
        ],
      },
      {
        id: "pi-32",
        title: "Observability Stack",
        description: "Full observability platform with distributed tracing, metrics, and log aggregation.",
        thumbnailUrl: "/portfolio/observability-thumb.jpg",
        assets: [
          { id: "a68", type: "live_preview", title: "Grafana Dashboard", url: "https://example.com" },
          { id: "a69", type: "image", title: "Trace Waterfall", url: "/portfolio/observability-trace.png" },
        ],
      },
    ],
  },
];

export function getCoderBySlug(slug: string): Coder | undefined {
  return coders.find((c) => c.slug === slug);
}

export function getCodersBySpecialty(specialty: Specialty): Coder[] {
  return coders.filter((c) => c.specialties.includes(specialty));
}

export const featuredCoders = coders.filter((c) => c.featured);

/* ── Project Dashboard Types & Mock Data ── */

export type TaskStatus = "todo" | "in_progress" | "done";

export type MockTask = {
  id: string;
  title: string;
  assigneeId: string;
  status: TaskStatus;
  dueDate: string;
};

export type DeliverableStatus = "pending" | "submitted" | "approved";

export type MockDeliverable = {
  id: string;
  title: string;
  status: DeliverableStatus;
  submittedById?: string;
  liveUrl?: string;
};

export type MockProject = {
  id: string;
  title: string;
  description: string;
  teamMemberIds: string[];
  tasks: MockTask[];
  deliverables: MockDeliverable[];
};

export const mockProject: MockProject = {
  id: "proj-1",
  title: "vibechckd Marketing Site",
  description:
    "Landing page and marketing site for vibechckd. Includes hero section, feature breakdowns, testimonials, and a waitlist signup flow.",
  teamMemberIds: ["1", "2", "4"],
  tasks: [
    {
      id: "t-1",
      title: "Design hero section layout",
      assigneeId: "1",
      status: "done",
      dueDate: "2026-04-10",
    },
    {
      id: "t-2",
      title: "Build responsive navigation",
      assigneeId: "2",
      status: "done",
      dueDate: "2026-04-11",
    },
    {
      id: "t-3",
      title: "Implement waitlist API endpoint",
      assigneeId: "2",
      status: "in_progress",
      dueDate: "2026-04-15",
    },
    {
      id: "t-4",
      title: "Create testimonials carousel",
      assigneeId: "1",
      status: "in_progress",
      dueDate: "2026-04-16",
    },
    {
      id: "t-5",
      title: "Set up design tokens and component library",
      assigneeId: "4",
      status: "todo",
      dueDate: "2026-04-18",
    },
  ],
  deliverables: [
    {
      id: "d-1",
      title: "Homepage Final Build",
      status: "submitted",
      submittedById: "1",
      liveUrl: "vibechckd.com",
    },
    {
      id: "d-2",
      title: "Design System Documentation",
      status: "pending",
    },
    {
      id: "d-3",
      title: "Waitlist Integration",
      status: "approved",
      submittedById: "2",
      liveUrl: "vibechckd.com/waitlist",
    },
  ],
};
