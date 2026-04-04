{
  "app_name": "MindLeaf",
  "design_personality": {
    "brand_attributes": [
      "playful-but-trustworthy (kid delight + parent confidence)",
      "storybook tactile (paper, ink, soft shadows)",
      "clean modern web (not app-like)",
      "Nigeria-first payments clarity (Paystack trust cues)"
    ],
    "visual_metaphors": [
      "storybook pages (paper texture, page corners, subtle spine)",
      "leaf motif (MindLeaf) as recurring accent shape",
      "sunrise warmth (orange) + growth calm (green)"
    ],
    "layout_principles": [
      "Bento grid for dashboard + library",
      "Magazine layout for marketing-like sections (hero, pricing)",
      "Story viewer uses centered book canvas but surrounding UI stays left-aligned"
    ]
  },
  "inspiration_sources": {
    "web_search_refs": [
      {
        "title": "Dribbble kids story app tag",
        "url": "https://dribbble.com/tags/kids-story-app",
        "takeaways": [
          "rounded cards, big illustration-first tiles",
          "simple navigation + large tap targets"
        ]
      },
      {
        "title": "Behance kids stories app search",
        "url": "https://www.behance.net/search/projects/kids%20stories%20app",
        "takeaways": [
          "storybook viewer layouts with image-top/text-bottom",
          "playful iconography + soft gradients used only as section accents"
        ]
      },
      {
        "title": "react-pageflip demo",
        "url": "https://nodlik.github.io/react-pageflip/",
        "takeaways": [
          "realistic page curl for story viewer",
          "mobileScrollSupport for touch devices"
        ]
      },
      {
        "title": "shadcn multi-step form blocks",
        "url": "https://www.shadcn.io/blocks/form-multi-step",
        "takeaways": [
          "stepper + per-step validation patterns",
          "clean wizard scaffolding compatible with shadcn form"
        ]
      }
    ],
    "fusion_direction": "Use storybook page-flip interaction (react-pageflip) + clean shadcn form patterns + warm Nigerian-friendly trust cues (Paystack) + bento dashboard layout."
  },
  "typography": {
    "google_fonts": {
      "display": {
        "family": "Brockmann",
        "fallback": "Space Grotesk",
        "usage": "H1/H2, story titles, pricing headings",
        "note": "If Brockmann is unavailable via Google Fonts in this environment, use Space Grotesk as the shipped alternative."
      },
      "body": {
        "family": "Figtree",
        "fallback": "Inter",
        "usage": "UI body, forms, tables"
      },
      "mono": {
        "family": "Azeret Mono",
        "usage": "credit counts, transaction refs, admin IDs"
      }
    },
    "tailwind_text_hierarchy": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg text-muted-foreground",
      "section_title": "text-xl sm:text-2xl font-semibold tracking-tight",
      "body": "text-sm sm:text-base leading-relaxed",
      "small": "text-xs sm:text-sm text-muted-foreground"
    },
    "story_reader_typography": {
      "story_title": "text-2xl sm:text-3xl font-semibold",
      "page_text": "text-base sm:text-lg leading-7 sm:leading-8",
      "page_caption": "text-xs text-muted-foreground"
    }
  },
  "color_system": {
    "notes": [
      "Primary colors must stay in #2E7D32 (green) and #FF8F00 (orange) ranges.",
      "Avoid purple entirely.",
      "Use gradients only as section accents (<20% viewport) and never on text-heavy surfaces."
    ],
    "palette": {
      "brand_green": {
        "500": "#2E7D32",
        "600": "#256628",
        "100": "#E7F4EA"
      },
      "brand_orange": {
        "500": "#FF8F00",
        "600": "#E67F00",
        "100": "#FFF1DB"
      },
      "ink": {
        "900": "#0F172A",
        "700": "#334155"
      },
      "paper": {
        "base": "#FFFCF6",
        "card": "#FFFFFF",
        "tint": "#F6F7F9"
      },
      "support": {
        "sky": "#D9F0FF",
        "mint": "#DFF7EA",
        "sand": "#F7E7C6"
      },
      "states": {
        "success": "#1B8A5A",
        "warning": "#B45309",
        "danger": "#B42318",
        "info": "#0B6AA2"
      }
    },
    "semantic_tokens_hsl_for_shadcn": {
      "background": "36 100% 98%",
      "foreground": "222 47% 11%",
      "card": "0 0% 100%",
      "card-foreground": "222 47% 11%",
      "popover": "0 0% 100%",
      "popover-foreground": "222 47% 11%",
      "primary": "132 46% 33%",
      "primary-foreground": "0 0% 100%",
      "secondary": "36 33% 94%",
      "secondary-foreground": "222 47% 11%",
      "muted": "36 20% 93%",
      "muted-foreground": "215 16% 35%",
      "accent": "33 100% 93%",
      "accent-foreground": "222 47% 11%",
      "destructive": "0 74% 45%",
      "destructive-foreground": "0 0% 100%",
      "border": "30 18% 86%",
      "input": "30 18% 86%",
      "ring": "132 46% 33%",
      "radius": "0.9rem"
    },
    "allowed_gradients": {
      "hero_accent": "linear-gradient(135deg, rgba(46,125,50,0.14), rgba(255,143,0,0.14), rgba(217,240,255,0.18))",
      "section_wash": "radial-gradient(900px circle at 20% 10%, rgba(255,143,0,0.14), transparent 55%), radial-gradient(900px circle at 80% 0%, rgba(46,125,50,0.12), transparent 55%)"
    },
    "do_not_use_gradients": [
      "from-blue-500 to-purple-600",
      "from-purple-500 to-pink-500",
      "from-green-500 to-blue-500",
      "from-red-500 to-pink-500"
    ]
  },
  "design_tokens_css": {
    "instructions": "Main agent should update /app/frontend/src/index.css :root tokens to match semantic_tokens_hsl_for_shadcn and add the extra custom properties below. Keep body left-aligned; remove any centered App defaults from App.css.",
    "css": ":root {\n  --paper: 36 100% 98%;\n  --paper-2: 36 33% 94%;\n  --ink: 222 47% 11%;\n  --ink-2: 215 16% 35%;\n  --brand-green: 132 46% 33%;\n  --brand-orange: 33 100% 50%;\n  --shadow-soft: 0 10px 30px rgba(15, 23, 42, 0.08);\n  --shadow-lift: 0 18px 50px rgba(15, 23, 42, 0.12);\n  --radius-card: 18px;\n  --radius-btn: 14px;\n  --noise-opacity: 0.06;\n}\n\n::selection { background: rgba(255, 143, 0, 0.25); }\n\n/* subtle noise overlay utility */\n.bg-noise {\n  position: relative;\n}\n.bg-noise::before {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  opacity: var(--noise-opacity);\n  background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.35\"/></svg>');\n  mix-blend-mode: multiply;\n}\n"
  },
  "grid_and_spacing": {
    "container": "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
    "section_spacing": "py-10 sm:py-14 lg:py-16",
    "bento_grid": "grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6",
    "card_spacing": "p-4 sm:p-6",
    "touch_targets": "min-h-11 min-w-11"
  },
  "components": {
    "component_path": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "carousel": "/app/frontend/src/components/ui/carousel.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "form": "/app/frontend/src/components/ui/form.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "radio_group": "/app/frontend/src/components/ui/radio-group.jsx",
      "toggle_group": "/app/frontend/src/components/ui/toggle-group.jsx",
      "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "sonner_toast": "/app/frontend/src/components/ui/sonner.jsx",
      "skeleton": "/app/frontend/src/components/ui/skeleton.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
      "pagination": "/app/frontend/src/components/ui/pagination.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx"
    },
    "button_system": {
      "style": "Playful/Youth but refined: pill-ish radius, solid fills, minimal gradients.",
      "variants": {
        "primary": {
          "use": "Main CTAs: Generate Story, Buy Credits, Pay",
          "tailwind": "rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-soft)] hover:bg-[hsl(var(--brand-green))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
          "micro_interaction": "hover: translateY(-1px) via shadow change only; active: scale-95"
        },
        "secondary": {
          "use": "My Library, Preview, Back",
          "tailwind": "rounded-[var(--radius-btn)] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border border-[hsl(var(--border))] hover:bg-white",
          "micro_interaction": "hover: subtle lift shadow"
        },
        "ghost": {
          "use": "Icon buttons in reader (tts, export)",
          "tailwind": "rounded-full hover:bg-[hsl(var(--muted))]",
          "micro_interaction": "hover: background fade; active: scale-95"
        },
        "danger": {
          "use": "Delete story",
          "tailwind": "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:opacity-95"
        }
      },
      "data_testid_examples": [
        "data-testid=\"story-create-generate-button\"",
        "data-testid=\"credits-buy-paystack-button\"",
        "data-testid=\"library-delete-story-button\""
      ]
    },
    "navigation": {
      "pattern": "Web-style top nav with subtle sticky behavior; mobile uses Sheet drawer.",
      "desktop": {
        "layout": "left: MindLeaf logo + leaf mark; center: primary links; right: credits pill + avatar menu",
        "shadcn": ["navigation-menu", "sheet", "dropdown-menu", "avatar", "badge"]
      },
      "mobile": {
        "layout": "top bar with logo + hamburger; drawer contains links + credits + buy button",
        "shadcn": ["sheet", "navigation-menu"]
      }
    },
    "dashboard_bento": {
      "cards": [
        {
          "name": "Greeting + quick actions",
          "span": "md:col-span-7",
          "content": "Hello, Parent. Today’s reading streak + New Story CTA + My Library",
          "accent": "small leaf illustration watermark"
        },
        {
          "name": "Credits",
          "span": "md:col-span-5",
          "content": "Credits remaining + Buy credits + recent usage",
          "accent": "orange accent border top"
        },
        {
          "name": "Continue reading",
          "span": "md:col-span-12",
          "content": "Last story card with Resume button"
        }
      ]
    },
    "story_creator_wizard": {
      "pattern": "Multi-step wizard with playful chips and clear credit costs.",
      "steps": [
        "Topic + vibe (chips)",
        "Age range (slider or radio cards)",
        "Subject (select)",
        "Length (radio cards with credit cost badge)",
        "Art style (image-like cards)",
        "Character traits (toggle group chips)",
        "Review + Generate"
      ],
      "shadcn": ["form", "tabs", "toggle-group", "radio-group", "select", "slider", "progress", "tooltip"],
      "credit_cost_ui": "Each length option is a Card with a top-right Badge showing credits (use Azeret Mono).",
      "loading_overlay": {
        "style": "Full-screen Dialog-like overlay with animated book + progress bar + rotating fun tips.",
        "shadcn": ["dialog", "progress", "skeleton"],
        "motion": "Framer Motion recommended for looping page-flip icon + staggered dots"
      },
      "data_testid": [
        "story-creator-topic-chip",
        "story-creator-age-range-slider",
        "story-creator-length-option",
        "story-creator-generate-submit"
      ]
    },
    "story_viewer": {
      "goal": "Feel like a real storybook: paper canvas, page corners, horizontal navigation, TTS controls.",
      "layout": {
        "outer": "bg-[hsl(var(--background))] bg-noise",
        "book_canvas": "max-w-3xl mx-auto rounded-[22px] bg-white shadow-[var(--shadow-lift)] border border-[hsl(var(--border))] overflow-hidden",
        "page": "p-4 sm:p-6",
        "illustration": "rounded-xl border bg-[hsl(var(--paper-2))] overflow-hidden",
        "text_area": "mt-4 sm:mt-6"
      },
      "navigation": {
        "desktop": "Prev/Next buttons + page indicator (e.g., 3/12)",
        "mobile": "Swipe gestures + large bottom nav bar",
        "shadcn": ["carousel", "pagination", "button", "tooltip"]
      },
      "page_flip_optional": {
        "library": "react-pageflip",
        "install": "npm i react-pageflip",
        "usage_note": "Use only in Story Viewer; fallback to shadcn Carousel on low-end devices or prefers-reduced-motion.",
        "accessibility": "Provide non-animated navigation buttons and keyboard arrows."
      },
      "tts_controls": {
        "controls": ["voice select", "play/pause", "stop", "speed"],
        "shadcn": ["select", "button", "slider"],
        "data_testid": [
          "story-viewer-tts-voice-select",
          "story-viewer-tts-play-button",
          "story-viewer-export-pdf-button",
          "story-viewer-next-page-button"
        ]
      }
    },
    "library_grid": {
      "pattern": "Cover-forward cards with playful corner ribbon for status (New/Finished).",
      "grid": "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6",
      "card": {
        "tailwind": "rounded-[var(--radius-card)] overflow-hidden border border-[hsl(var(--border))] bg-white shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]",
        "cover": "aspect-[4/3] bg-[hsl(var(--paper-2))]",
        "meta": "p-3 sm:p-4"
      },
      "actions": "Delete uses AlertDialog confirmation.",
      "shadcn": ["card", "alert-dialog", "dropdown-menu", "badge"],
      "data_testid": ["library-story-card", "library-story-open-button", "library-story-delete-confirm"]
    },
    "buy_credits_pricing": {
      "pattern": "Pricing cards with Paystack trust cues and clear NGN amounts.",
      "cards": "grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6",
      "card_style": "rounded-[var(--radius-card)] bg-white border border-[hsl(var(--border))] shadow-[var(--shadow-soft)]",
      "highlight": "Most popular plan gets orange top border + subtle sand background tint.",
      "trust_row": "Under CTA: Paystack logo placeholder + 'Secure payment' + 'Cards/Bank transfer'",
      "shadcn": ["card", "badge", "button", "separator"],
      "data_testid": ["credits-package-card", "credits-package-select-button", "paystack-checkout-button"]
    },
    "admin_panel": {
      "tone": "More professional, less playful; keep brand accents minimal.",
      "table": "Use shadcn Table with sticky header; filters in a top toolbar.",
      "shadcn": ["table", "input", "select", "dialog", "badge"],
      "data_testid": ["admin-users-table", "admin-grant-credits-button", "admin-change-role-select"]
    }
  },
  "motion_and_microinteractions": {
    "principles": [
      "Use motion to explain state changes (step transitions, page turns, payment success).",
      "Respect prefers-reduced-motion: disable page flip and heavy parallax.",
      "No transition: all. Only transition colors/shadows/opacity."
    ],
    "recommended_library": {
      "name": "framer-motion",
      "install": "npm i framer-motion",
      "use_cases": [
        "wizard step transitions (slide/fade)",
        "loading overlay (looping page flip)",
        "library card entrance (stagger)"
      ]
    },
    "interaction_specs": {
      "cards": "hover: shadow from soft->lift + translate-y-0.5 (optional)",
      "chips": "selected: bg accent + ring primary; hover: bg muted",
      "buttons": "active: scale-95; focus-visible ring always",
      "story_viewer": "page change: subtle fade-in (150-220ms)"
    }
  },
  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text on paper backgrounds.",
      "Keyboard navigation: wizard steps, story viewer prev/next, admin table actions.",
      "Focus states: visible ring using --ring token.",
      "TTS controls must have aria-labels and tooltips.",
      "Provide large tap targets for kids (>=44px)."
    ]
  },
  "images": {
    "image_urls": [
      {
        "category": "hero",
        "description": "Cozy reading moment for landing/dashboard hero banner",
        "url": "https://images.unsplash.com/photo-1532789339108-2ebc484efbf1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwzfHxjaGlsZHJlbiUyMHJlYWRpbmclMjBib29rJTIwY296eSUyMGlsbHVzdHJhdGlvbnxlbnwwfHx8fDE3NzUzMDQ4NzV8MA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "library_empty_state",
        "description": "Hands holding a book (use as subtle empty-state illustration with opacity mask)",
        "url": "https://images.unsplash.com/photo-1649179730763-c81c4eaf72d3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxjaGlsZHJlbiUyMHJlYWRpbmclMjBib29rJTIwY296eSUyMGlsbHVzdHJhdGlvbnxlbnwwfHx8fDE3NzUzMDQ4NzV8MA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "story_viewer_background",
        "description": "Colorful comic reading (blurred as background wash behind book canvas)",
        "url": "https://images.unsplash.com/photo-1742070915853-5bfa687b476b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHw0fHxjaGlsZHJlbiUyMHJlYWRpbmclMjBib29rJTIwY296eSUyMGlsbHVzdHJhdGlvbnxlbnwwfHx8fDE3NzUzMDQ4NzV8MA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "kid_profile_avatar_seed",
        "description": "Boy reading (can be used as placeholder avatar in demo data)",
        "url": "https://images.unsplash.com/photo-1542373175994-7b25d3f78a4e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwyfHxjaGlsZHJlbiUyMHJlYWRpbmclMjBib29rJTIwY296eSUyMGlsbHVzdHJhdGlvbnxlbnwwfHx8fDE3NzUzMDQ4NzV8MA&ixlib=rb-4.1.0&q=85"
      }
    ],
    "illustration_strategy": {
      "note": "Generated story illustrations should be framed consistently: rounded-xl, subtle border, paper tint background. Avoid full-bleed saturated images; keep margins like a printed book.",
      "fallback": "If illustration missing, show Skeleton + a leaf watermark SVG."
    }
  },
  "extra_libraries": {
    "recommended": [
      {
        "name": "react-pageflip",
        "why": "storybook-like page turning in Story Viewer",
        "install": "npm i react-pageflip",
        "usage": "Only for Story Viewer; fallback to shadcn Carousel when prefers-reduced-motion or on small screens."
      },
      {
        "name": "framer-motion",
        "why": "micro-interactions + loading overlay delight",
        "install": "npm i framer-motion",
        "usage": "Animate wizard transitions, card entrance, and loading overlay."
      }
    ]
  },
  "instructions_to_main_agent": [
    "Update /app/frontend/src/index.css :root HSL tokens to match semantic_tokens_hsl_for_shadcn; keep existing shadcn structure.",
    "Remove CRA demo styling from /app/frontend/src/App.css (especially centered header). Do NOT add .App { text-align:center }.",
    "Use shadcn/ui components from /app/frontend/src/components/ui/*.jsx (project is .js/.jsx).",
    "Every interactive element and key info label must include data-testid in kebab-case.",
    "Implement Story Viewer with a 'book canvas' card: illustration top, text bottom, with Prev/Next + page indicator; optionally add react-pageflip with reduced-motion fallback.",
    "Keep gradients minimal and only as section background accents (<20% viewport). No gradients on cards or text-heavy areas.",
    "Use orange primarily for highlights (badges, pricing emphasis) and green for primary actions and focus rings.",
    "Admin panel should be calmer: mostly paper/ink neutrals with small green/orange accents."
  ],
  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
