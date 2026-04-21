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
    version: "v1.1.1",
    date: "April 21, 2026",
    description: "Emergency infrastructure patch following the Vercel environment variable security event.",
    changes: [
      {
        category: "fixed",
        items: [
          "Legacy Supabase JWT Keys: Deprecated 'anon' and 'service_role' tokens in favor of the new Publishable and Secret key architecture.",
          "Security Boundary Hardening: Reconfigured server initialization logic to explicitly isolate Secret keys from the browser bundle.",
          "Vercel Environment Leak Mitigation: Rotated all project secrets and updated environment variable naming conventions to meet 2026 security standards."
        ],
      }
    ],
  },
  {
    version: "v1.1.0",
    date: "April 17, 2026",
    description: "Polishing the professional experience and navigation UI.",
    changes: [
      {
        category: "added",
        items: [
          "Premium CTA: Redesigned the 'Open in Maps' action into a prominent floating card for shared route views.",
          "Dynamic Banner: Introduced the compact, non-obtrusive version announcement header.",
        ],
      },
      {
        category: "changed",
        items: [
          "UI De-cluttering: Removed redundant action buttons from the route creation view to focus on the map canvas.",
          "Banner Aesthetics: Refined typography and color contrast for better readability in dark mode.",
        ],
      },
    ],
  },
  {
    version: "v1.0.5",
    date: "April 16, 2026",
    description: "Introduced road-snapping infrastructure and interactive settings.",
    changes: [
      {
        category: "added",
        items: [
          "Auto-Routing Engine: Native OSRM integration snaps pins to actual driving roads automatically.",
          "Routing Modes: Added 'Automatic' and 'Manual' toggles via a redesigned Settings tab.",
          "Magnetic point snapping for 'Manual' paths ensuring endpoints lock perfectly onto markers.",
        ],
      },
      {
        category: "fixed",
        items: [
          "Bottom action button layout collisions on smaller mobile screens.",
          "Framer Motion drag events unintentionally triggering menu toggles when releasing a swipe.",
        ],
      },
    ],
  },
  {
    version: "v1.0.1",
    date: "April 15, 2026",
    description: "Mobile-first responsive overhaul and touch optimization.",
    changes: [
      {
        category: "added",
        items: [
          "Swipeable Bottom Sheet: Built a native-feeling drawer layout for tool management on mobile.",
          "Viewport Lock: Implemented rubber-banding prevention to keep the map steady during interaction.",
        ],
      },
      {
        category: "fixed",
        items: [
          "Touch Targets: Expanded interactive hitboxes to 44x44px for easier finger tapping.",
          "Pinch-to-Zoom: Fixed drawing tools hijacking native gestures by dynamically freezing Mapbox states.",
        ],
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "April 13, 2026",
    description: "Initial debut of RouteShare core architecture.",
    changes: [
      {
        category: "added",
        items: [
          "Mapbox GL JS & Draw integration for custom polyline tracking.",
          "Supabase Backend: Initial sync with strict Row Level Security (RLS) policies.",
          "GeoJSON Validation: Server-side payload sanitization for secure route sharing.",
          "High-Contrast Dark Mode: Custom-tuned canvas theme for professional aesthetics.",
        ],
      },
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
