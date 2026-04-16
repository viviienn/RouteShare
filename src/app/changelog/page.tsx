import Link from "next/link";
import { ArrowLeft, PlusCircle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";

type LogCategory = "added" | "fixed" | "changed" | "removed";

interface ChangelogEntry {
  version: string;
  date: string;
  description?: string;
  changes: {
    category: LogCategory;
    items: string[];
  }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "April 16, 2026",
    date: "Routing & Animations",
    description: "Introduced road-snapping infrastructure, massive UI improvements, and interactive settings.",
    changes: [
      {
        category: "added",
        items: [
          "Auto-Routing Engine (OSRM integration) natively snaps pins to actual driving roads.",
          "Route Maker Modes: Added 'Automatic' and 'Manual' routing options via a new Settings tab.",
          "Magnetic point snapping for 'Manual' paths ensuring endpoints lock perfectly onto markers.",
          "Framer Motion animations for butter-smooth UI physics and drawer height transitions.",
          "Changelog page to track project history natively.",
          "Animated Framer Motion page transitions for seamlessly swapping paths."
        ],
      },
      {
        category: "fixed",
        items: [
          "Mobile touch sensitivity: Resolved drawing tools hijacking native pinch-to-zoom gestures by dynamically freezing Mapbox engine states.",
          "Framer Motion drag events unintentionally triggering menu toggles when releasing a swipe.",
          "Bottom action button layout collisions on smaller mobile screens.",
        ],
      },
      {
        category: "changed",
        items: [
          "Upgraded into a single 'Unified Toolbox' that floats gracefully on desktop and anchors dynamically on mobile.",
          "Replaced hardcoded action placements to ensure the 'Generate Share Link' button stays firmly attached to the drawer footer.",
        ],
      },
      {
        category: "removed",
        items: [
          "Removed the 'Vaul' drawer library in favor of Framer Motion for better parity between Desktop and Mobile.",
        ],
      },
    ],
  },
  {
    version: "April 15, 2026",
    date: "Mobile Responsive Overhaul",
    description: "Re-engineered the interface to prioritize mobile users interacting with the map.",
    changes: [
      {
        category: "added",
        items: [
          "Unified collapsible toolbox layout that adapts conditionally to desktop grids and smart mobile panels.",
          "Mobile-native bottom drawer infrastructure optimized for thumb reachability.",
        ],
      },
      {
        category: "fixed",
        items: [
          "Significantly expanded interactive hitboxes (touch targets) across Mapbox pins and node vertices for easier tapping.",
          "Viewport cutoff bugs preventing map touch events on certain mobile browsers.",
        ]
      }
    ],
  },
  {
    version: "April 14, 2026",
    date: "Public Core Architecture Launch",
    description: "The initial debut of RouteShare to bridge driver and customer logistics.",
    changes: [
      {
        category: "added",
        items: [
          "Mapbox GL JS and Mapbox Draw integration supporting custom polyline tracking.",
          "Supabase backend synchronization with strictly configured Row Level Security (RLS).",
          "Responsive, high-contrast dark aesthetic.",
          "Custom SVG Mapbox Markers indicating 'Driver Start' vs 'Destination'.",
          "Comprehensive README encompassing vision, technical architecture, and implementation rationale."
        ],
      },
       {
        category: "fixed",
        items: [
          "React hydration and Next.js button title prop build warnings."
        ]
       }
    ],
  },
];

const CategoryBadge = ({ category }: { category: LogCategory }) => {
  switch (category) {
    case "added":
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest w-fit">
          <PlusCircle className="w-3 h-3" />
          Added
        </span>
      );
    case "fixed":
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest w-fit">
          <CheckCircle2 className="w-3 h-3" />
          Fixed
        </span>
      );
    case "changed":
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest w-fit">
          <RefreshCw className="w-3 h-3" />
          Changed
        </span>
      );
    case "removed":
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest w-fit">
          <XCircle className="w-3 h-3" />
          Removed
        </span>
      );
  }
};

export default function ChangelogPage() {
  return (
    <main className="w-full h-full overflow-y-auto bg-neutral-950 text-neutral-300 font-sans selection:bg-cyan-500/30">
      {/* Navbar Container */}
      <div className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors group"
          >
            <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to App
          </Link>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
            Updates & History
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 pb-32">
        <div className="mb-16">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Changelog
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed max-w-xl">
            All the latest features, improvements, and bug fixes shipped to RouteShare. We build fast.
          </p>
        </div>

        <div className="flex flex-col gap-16">
          {CHANGELOG.map((log) => (
            <section key={log.version} className="relative">
              {/* Timeline dot */}
              <div className="absolute left-[-29px] top-2 hidden md:block">
                <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              </div>

              <div className="flex flex-col md:border-l md:border-white/10 md:pl-8">
                <header className="mb-8">
                  <div className="flex items-baseline gap-4 mb-2">
                    <h2 className="text-2xl font-bold text-white">{log.version}</h2>
                    <span className="text-sm font-medium text-neutral-500">{log.date}</span>
                  </div>
                  {log.description && (
                    <p className="text-base text-neutral-400 leading-relaxed">{log.description}</p>
                  )}
                </header>

                <div className="flex flex-col gap-8">
                  {log.changes.map((group, i) => (
                    <div key={i} className="flex flex-col gap-4">
                      <CategoryBadge category={group.category} />
                      <ul className="flex flex-col gap-3">
                        {group.items.map((item, j) => (
                          <li key={j} className="text-[15px] text-neutral-300 leading-relaxed pl-1">
                            <span className="text-neutral-600 mr-2">—</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
