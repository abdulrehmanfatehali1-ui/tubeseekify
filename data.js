/**
 * TubeSeekify - Initial Seed Data & Database Simulation
 * This file serves as a local data store, structured to simulate a backend database.
 */

const INITIAL_PROMPTS = [
  {
    id: "p1",
    title: "Viral Video Hook Generator",
    description: "Generate 5 high-converting, attention-grabbing opening hooks tailored to your specific video topic and target audience. Uses emotional triggers and curiosity gaps.",
    category: "Scripts",
    promptText: "Act as an expert YouTube scriptwriter. Generate 5 distinct, high-impact hooks (first 10-15 seconds) for a video about [TOPIC]. The target audience is [AUDIENCE]. For each hook, specify the visual direction, the spoken voiceover, and the psychological trigger used (e.g., pattern interrupt, curiosity gap, emotional stakes). Ensure the hooks are concise, punchy, and designed to maximize viewer retention.",
    tags: ["Retention", "Hooks", "Storytelling"],
    copiedCount: 342,
    createdAt: "2026-05-10T12:00:00Z"
  },
  {
    id: "p2",
    title: "High-CTR Title Brainstormer",
    description: "Get 15 click-worthy YouTube titles using proven psychological formulas (fear of missing out, curiosity, unexpected comparison, numbers).",
    category: "Titles",
    promptText: "You are a master of YouTube CTR optimization. Brainstorm 15 video titles for a video about [TOPIC]. Group them into the following 5 formats: 1. Curiosity Gap, 2. Extreme Comparison, 3. Question-Based, 4. Negativity Bias, 5. High-Stakes Statement. Keep all titles under 55 characters to avoid truncation in recommendations. Optimize for clickability without being misleading clickbait.",
    tags: ["CTR", "Titles", "SEO"],
    copiedCount: 512,
    createdAt: "2026-05-12T14:30:00Z"
  },
  {
    id: "p3",
    title: "YouTube SEO & Metadata Optimizer",
    description: "Create fully optimized video descriptions, structured chapters, long-tail tags, and title variations based on target search keywords.",
    category: "SEO",
    promptText: "Act as a YouTube SEO Specialist. Optimize a video with the primary keyword: [KEYWORD]. Generate: 1. A search-friendly description (first 3 lines rich in keywords, followed by timestamps placeholders, links, and social outlets), 2. A list of 15 long-tail tags ordered by search relevance, 3. 3 optimized title variants. Ensure natural keyword integration to maximize algorithm visibility.",
    tags: ["SEO", "Algorithm", "Metadata"],
    copiedCount: 289,
    createdAt: "2026-05-14T09:15:00Z"
  },
  {
    id: "p4",
    title: "Aesthetic Thumbnail Design Concepts",
    description: "Generate visual concept descriptions, text overlay suggestions, and color palettes that graphic designers or Midjourney can use for thumbnails.",
    category: "Thumbnails",
    promptText: "You are a creative director specializing in YouTube thumbnails. For a video titled '[TITLE]', brainstorm 3 distinct thumbnail concepts. For each concept, describe: 1. The main focal point/subject, 2. The background elements, 3. The exact text overlay (maximum 3 words), 4. The color palette (dominant, secondary, accent), 5. The emotional feeling of the thumbnail. Recommend font styles and lighting cues.",
    tags: ["Thumbnail", "Design", "Midjourney"],
    copiedCount: 198,
    createdAt: "2026-05-15T18:22:00Z"
  },
  {
    id: "p5",
    title: "Full 10-Minute Video Script Outline",
    description: "Create a highly engaging, structured, and retaining outline for a 10-minute video including intros, main points, transitions, and calls to action.",
    category: "Scripts",
    promptText: "Act as an expert YouTube director. Draft a highly structured video outline for a 10-minute video about [TOPIC]. The structure must divide the video into 5 key blocks: Intro (0:00-1:00), Content Block 1 (1:00-3:30), Content Block 2 (3:30-6:00), Content Block 3 (6:00-8:30), Outro & CTA (8:30-10:00). For each block, provide: - Script direction (general talking points), - Visual cues (b-roll, graphs, zooms), - Pacing guidelines, - A re-engagement hook to prevent viewer drop-off.",
    tags: ["Scripts", "Structure", "Engagement"],
    copiedCount: 405,
    createdAt: "2026-05-16T11:05:00Z"
  },
  {
    id: "p6",
    title: "Description Box & Timestamp Formatter",
    description: "Instantly draft structured description templates that increase search traffic and neatly outline chapters and affiliate disclosures.",
    category: "SEO",
    promptText: "Create a professional YouTube Description template. The template must contain: 1. A 150-word search-engine optimized summary of the video topic: [TOPIC], 2. A placeholder list for video chapters/timestamps, 3. An Affiliate Disclosure notice, 4. Social media follow links, 5. Disclaimer statement. Structure it cleanly with neat divider lines and bullet points.",
    tags: ["SEO", "Formatting", "Links"],
    copiedCount: 176,
    createdAt: "2026-05-18T16:45:00Z"
  },
  {
    id: "p7",
    title: "Community Post Spark Templates",
    description: "Generate 5 high-engagement polls, stories, and sneak-peek posts to interact with your subscribers in the Community Tab.",
    category: "SEO",
    promptText: "You are a social media manager for top creators. Generate 5 community tab posts for a channel focused on [NICHE]. Include: 2 Poll topics (with options and context), 1 Behind-the-scenes text update, 1 Sneak-peek promo teaser script, and 1 interactive question designed to spark a high volume of comments. Tailor for high reach in the YouTube Home Feed.",
    tags: ["Community", "Engagement", "Subscribers"],
    copiedCount: 122,
    createdAt: "2026-05-20T08:12:00Z"
  },
  {
    id: "p8",
    title: "Double-CTR Thumbnail Text Analyzer",
    description: "Analyze and refine thumbnail text overlays to ensure they complement the title rather than repeating it.",
    category: "Thumbnails",
    promptText: "Act as a YouTube CTR consultant. Analyze the video title: '[TITLE]'. Suggest 5 different text overlay options for the thumbnail. Each overlay option must: 1. Be maximum 3 words, 2. Complement the title by creating curiosity instead of repeating it, 3. Use high-impact verbs or emotional triggers. Explain the psychological rationale behind each choice.",
    tags: ["CTR", "Copywriting", "Thumbnails"],
    copiedCount: 224,
    createdAt: "2026-05-21T10:50:00Z"
  }
];

const INITIAL_RESOURCES = [
  {
    id: "r1",
    title: "100K Subscriber Growth Blueprint",
    description: "A comprehensive PDF handbook detailing the exact growth strategies, algorithmic sequencing, and upload schedules used by top-tier YouTube creators.",
    category: "PDF Guide",
    downloadUrl: "#",
    fileSize: "12.4 MB",
    readTime: "25 min read",
    tags: ["Strategy", "Subscribers", "Growth"],
    downloadedCount: 1450
  },
  {
    id: "r2",
    title: "High-CTR Thumbnail Visual Checklist",
    description: "A step-by-step graphic checklist covering lighting, contrast rules, focal composition, font size check, and mobile layout preview rules.",
    category: "Checklist",
    downloadUrl: "#",
    fileSize: "4.8 MB",
    readTime: "8 min read",
    tags: ["Design", "CTR", "Thumbnails"],
    downloadedCount: 928
  },
  {
    id: "r3",
    title: "Sponsor Pitch Email & Negotiation Templates",
    description: "Ready-to-use email templates for pitching brands, negotiating integration rates, and outlining deliverable contracts.",
    category: "Templates",
    downloadUrl: "#",
    fileSize: "1.2 MB",
    readTime: "15 min templates",
    tags: ["Monetization", "Sponsorship", "Outreach"],
    downloadedCount: 815
  },
  {
    id: "r4",
    title: "A/B Title and Thumbnail Experiment Tracker",
    description: "An interactive Notion template/spreadsheet to track CTR changes, initial speed performance, and title iterations to find viral fits.",
    category: "Templates",
    downloadUrl: "#",
    fileSize: "2.1 MB",
    readTime: "5 min setup",
    tags: ["Analytics", "Notion", "Optimization"],
    downloadedCount: 673
  },
  {
    id: "r5",
    title: "Video Editing Workflow & Asset Vault",
    description: "Standard operating procedures (SOPs) for sound design, B-roll insertion, color grading, and export settings for maximum visual clarity on YouTube.",
    category: "Checklist",
    downloadUrl: "#",
    fileSize: "8.5 MB",
    readTime: "18 min read",
    tags: ["Editing", "Workflow", "SOP"],
    downloadedCount: 549
  }
];

const DEFAULT_USER_PROFILE = {
  name: "Abdul Creator",
  email: "abdul@tubeseekify.io",
  tier: "Creator Elite (Pro)",
  walletAddress: "0x7a8...e49f",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  joinDate: "May 2026",
  usageLimit: {
    max: 100,
    current: 42
  },
  apiKeys: [
    { name: "Production Key", key: "tsk_live_8f3a9e...2b7c", createdAt: "2026-05-12" }
  ],
  bookmarks: ["p1", "p4", "r2"], // Array of IDs (prompts or resources)
  copyHistory: [
    { itemId: "p1", title: "Viral Video Hook Generator", type: "prompt", timestamp: "2026-05-23T20:10:00Z" },
    { itemId: "p2", title: "High-CTR Title Brainstormer", type: "prompt", timestamp: "2026-05-23T18:45:00Z" }
  ]
};

const INITIAL_ANALYTICS = {
  summary: {
    totalPageViews: 24890,
    activeUsers: 1420,
    totalCopies: 4890,
    totalBookmarks: 843
  },
  dailyTraffic: [
    { date: "May 17", views: 2100, copies: 430 },
    { date: "May 18", views: 2400, copies: 490 },
    { date: "May 19", views: 2800, copies: 530 },
    { date: "May 20", views: 2500, copies: 480 },
    { date: "May 21", views: 3100, copies: 610 },
    { date: "May 22", views: 3400, copies: 680 },
    { date: "May 23", views: 3800, copies: 740 }
  ],
  categoryBreakdown: [
    { category: "SEO", count: 32 },
    { category: "Scripts", count: 45 },
    { category: "Titles", count: 28 },
    { category: "Thumbnails", count: 20 }
  ]
};

// Export to window object for access in other scripts since this is pure browser JS
window.TubeSeekifyData = {
  prompts: INITIAL_PROMPTS,
  resources: INITIAL_RESOURCES,
  userProfile: DEFAULT_USER_PROFILE,
  analytics: INITIAL_ANALYTICS
};
