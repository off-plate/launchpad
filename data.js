// App data and content seeds for Launchpad
window.LP_DATA = {
  apps: {
    personal: [
      { name: "Jarvis",        glyph: "🔥", tag: "Dash",   color: ["#ff7a45","#c2410c"], url: "https://personal-dashboard-jarvis.netlify.app/", desc: "Personal life cockpit" },
      { name: "Corner",        glyph: "🎬", tag: "App",    color: ["#ef4444","#7f1d1d"], url: "https://michaels-corner.netlify.app/",         desc: "Personal brand HQ" },
      { name: "Hunterpart",    glyph: "🏠", tag: "Tool",   color: ["#60a5fa","#1e3a8a"], url: "https://hunterpart.netlify.app/",              desc: "Prague apartment hunt" },
      { name: "LiftUp",        glyph: "💪", tag: "Web",    color: ["#fde047","#a16207"], url: "https://lift-up.netlify.app/",                 desc: "Impulse buy → hours of life" },
      { name: "Zepp Health",   glyph: "♥",  tag: "Dash",   color: ["#fb7185","#9f1239"], url: "https://zepp-health.netlify.app/",             desc: "Health dashboard" },
      { name: "Hodina",        glyph: "⏱",  tag: "App",    color: ["#a78bfa","#5b21b6"], url: "https://hodina.netlify.app/",                  desc: "Time tracker" },
      { name: "Ace",           glyph: "🎓", tag: "Web",    color: ["#14b8a6","#115e59"], url: "https://ace-technik.netlify.app/",             desc: "Online certifications" },
      { name: "Vibes",         glyph: "🎵", tag: "AI",     color: ["#34d399","#065f46"], url: "https://spotify-vibes.netlify.app/",           desc: "Vibe → Spotify playlist" },
      { name: "Marketeer",     glyph: "🧠", tag: "AI",     color: ["#f472b6","#831843"], url: "https://marketeers.netlify.app/",              desc: "Senior marketing consult" },
      { name: "Postěžuj si",   glyph: "💬", tag: "Web",    color: ["#fb923c","#7c2d12"], url: "https://postezuj-si.netlify.app/",             desc: "Vent anonymously" },
      { name: "Akcie vs byty", glyph: "📈", tag: "GH",     color: ["#22d3ee","#155e75"], url: "https://off-plate.github.io/30years/",         desc: "Stocks vs apartments" }
    ],
    offplate: [
      { name: "Audits",        glyph: "📋", tag: "GH",     color: ["#facc15","#854d0e"], url: "https://off-plate.github.io/audits/",          desc: "Client audit deliverables" },
      { name: "off-plate",     glyph: "🐙", tag: "Src",    color: ["#a3a3a3","#404040"], url: "https://github.com/off-plate",                 desc: "All repos" }
    ],
    tools: [
      { name: "Claude",        glyph: "🎨", tag: "AI",     color: ["#d97757","#8a3a17"], url: "https://claude.ai/design",                     desc: "Anthropic's design playground" }
    ]
  },

  // Public-domain / ancient sources only. Original translations / paraphrase where useful.
  quotes: [
    { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", who: "Marcus Aurelius" },
    { text: "Luck is what happens when preparation meets opportunity.", who: "Seneca" },
    { text: "We suffer more often in imagination than in reality.", who: "Seneca" },
    { text: "It is not the man who has too little, but the man who craves more, that is poor.", who: "Seneca" },
    { text: "The impediment to action advances action. What stands in the way becomes the way.", who: "Marcus Aurelius" },
    { text: "Waste no more time arguing what a good man should be. Be one.", who: "Marcus Aurelius" },
    { text: "He who has a why to live for can bear almost any how.", who: "Friedrich Nietzsche" },
    { text: "The cave you fear to enter holds the treasure you seek.", who: "Joseph Campbell" },
    { text: "Discipline equals freedom.", who: "Old proverb" },
    { text: "First, solve the problem. Then, write the code.", who: "John Johnson" },
    { text: "What you do every day matters more than what you do once in a while.", who: "Gretchen Rubin" },
    { text: "If you are tired, learn to rest, not to quit.", who: "Banksy" }
  ],

  // Default seed for the todo
  todoSeed: [
    { id: 1, text: "Ship Launchpad v2 redesign", done: false },
    { id: 2, text: "Review Hunterpart scrape errors", done: true },
    { id: 3, text: "Record Corner episode draft", done: false },
    { id: 4, text: "Workout — push day", done: false },
    { id: 5, text: "Pay invoices Q2", done: true }
  ],

  // Calendar events — empty until a real Google Calendar integration is wired up.
  events: {
    today: [],
    eventDays: []
  }
};
