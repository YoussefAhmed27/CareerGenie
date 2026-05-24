// @ts-nocheck
export const THEME = {
  colors: {
    bg: "#0B0C1E",
    surface: "#151632",
    primary: "#22d3ee", // Cyan
    secondary: "#d946ef", // Fuchsia
    textMain: "#FFFFFF",
    textMuted: "#94A3B8",
  },
  gradients: {
    primary: "bg-gradient-to-r from-[#22d3ee] to-[#d946ef]",
    surface: "bg-[#151632]/80 backdrop-blur-xl border border-white/10",
  }
};

export const JOBS = [
  { id: 101, title: "Senior React Developer", dept: "Engineering", type: "Remote", candidates: 45, screened: 12, status: "Active" },
  { id: 102, title: "Product Designer", dept: "Design", type: "Hybrid", candidates: 28, screened: 5, status: "Active" },
  { id: 103, title: "Marketing Manager", dept: "Marketing", type: "On-site", candidates: 0, screened: 0, status: "Draft" },
];

export const TEAM_MEMBERS = [
  { id: 1, name: "Sarah Jenkins", role: "Head of Talent", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
  { id: 2, name: "Mike Ross", role: "Tech Recruiter", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150" },
  { id: 3, name: "David Kim", role: "Hiring Manager", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
];

export const CANDIDATES = [
  { id: 1, name: "Alex Chen", initials: "AC", role: "Senior React Developer", score: 92, status: "Recommended", stage: "AI Interview", source: "Batch Upload", date: "Oct 24", metrics: { tech: 95, comm: 88, culture: 90, confidence: 85 } },
  { id: 2, name: "Sarah Connor", initials: "SC", role: "Senior React Developer", score: 88, status: "Review", stage: "CV Screen", source: "Batch Upload", date: "Oct 23", metrics: { tech: 85, comm: 92, culture: 85, confidence: 90 } },
  { id: 3, name: "Mike Ross", initials: "MR", role: "Senior React Developer", score: 74, status: "Rejected", stage: "CV Screen", source: "Batch Upload", date: "Oct 22", metrics: { tech: 70, comm: 80, culture: 70, confidence: 60 } },
  { id: 4, name: "Emily Blunt", initials: "EB", role: "Senior React Developer", score: 81, status: "Recommended", stage: "AI Interview", source: "Batch Upload", date: "Oct 24", metrics: { tech: 82, comm: 78, culture: 85, confidence: 80 } },
];
