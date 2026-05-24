import { useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiTarget,
  FiUploadCloud,
} from "react-icons/fi";
import Navbar from "../components/Navbar/Navbar";
import {
  analyzeCv,
  getTailoredCvDownloadUrl,
  tailorCv,
  type AnalysisSection,
  type CVAnalysisResult,
  type TailoringResponse,
} from "../api/cvService";

type LoadingAction = "analysis" | "tailor" | null;

const sectionLabels: Array<[keyof CVAnalysisResult["cv_analysis"], string]> = [
  ["ats_compatibility", "ATS"],
  ["structure", "Structure"],
  ["skills_section", "Skills"],
  ["education", "Education"],
  ["experience", "Experience"],
  ["contact_info", "Contact"],
  ["professional_summary", "Summary"],
];

const scoreTone = (score: number) => {
  if (score >= 80) return "text-emerald-300 border-emerald-400/40 bg-emerald-400/10";
  if (score >= 60) return "text-[#2EE8F1] border-[#2EE8F1]/40 bg-[#2EE8F1]/10";
  if (score >= 40) return "text-amber-300 border-amber-300/40 bg-amber-300/10";
  return "text-red-300 border-red-300/40 bg-red-300/10";
};

const formatLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const ScorePill = ({ label, score }: { label: string; score: number }) => (
  <div className={`rounded-xl border px-4 py-3 ${scoreTone(score)}`}>
    <p className="text-xs uppercase opacity-80">{label}</p>
    <p className="mt-1 text-3xl font-bold">{score}</p>
  </div>
);

const SectionScore = ({ label, section }: { label: string; section: AnalysisSection }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-start justify-between gap-4">
      <h3 className="font-semibold text-white">{label}</h3>
      <span className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${scoreTone(section.score * 10)}`}>
        {section.score}/10
      </span>
    </div>
    <p className="mt-3 text-sm leading-6 text-white/70">{section.feedback}</p>
  </div>
);

const EmptyState = () => (
  <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center">
    <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-[#2EE8F1]">
      <FiFileText size={30} />
    </div>
    <h2 className="text-2xl font-bold text-white">CV Assistant</h2>
    <p className="mt-3 max-w-md text-sm leading-6 text-white/60">No results yet.</p>
  </div>
);

const CVAssistant = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [tailoredCv, setTailoredCv] = useState<TailoringResponse | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState("");

  const isBusy = loadingAction !== null;

  const handleFileChange = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Upload a PDF or DOCX file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError("");
    setAnalysis(null);
    setTailoredCv(null);
  };

  const runAnalysis = async () => {
    if (!file) {
      setError("Upload a CV first.");
      return;
    }

    setLoadingAction("analysis");
    setError("");

    try {
      const result = await analyzeCv(file, jdText);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze CV.");
    } finally {
      setLoadingAction(null);
    }
  };

  const runTailoring = async () => {
    if (!file) {
      setError("Upload a CV first.");
      return;
    }

    if (!jdText.trim()) {
      setError("Add a job description before tailoring.");
      return;
    }

    setLoadingAction("tailor");
    setError("");

    try {
      const result = await tailorCv(file, jdText);
      setTailoredCv(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to tailor CV.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#11152D] px-4 pb-12 pt-28 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-[#2EE8F1]">CareerGenie</p>
              <h1 className="mt-2 text-4xl font-bold md:text-5xl">CV Assistant</h1>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <FiTarget className="text-[#E240CA]" />
              <span>Analysis and tailoring</span>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-white/10 bg-[#0B0F19]/70 p-5 shadow-2xl">
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    inputRef.current?.click();
                  }
                }}
                className="grid min-h-48 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-5 text-center transition hover:border-[#2EE8F1]/60 hover:bg-[#2EE8F1]/5"
              >
                <div>
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#2EE8F1]/10 text-[#2EE8F1]">
                    <FiUploadCloud size={28} />
                  </div>
                  <p className="font-semibold text-white">{file ? file.name : "Upload CV"}</p>
                  <p className="mt-2 text-sm text-white/50">PDF or DOCX</p>
                </div>
              </div>

              <input
                ref={inputRef}
                className="hidden"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />

              <label htmlFor="job-description" className="mt-5 block text-sm font-semibold text-white/80">
                Job Description
              </label>
              <textarea
                id="job-description"
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
                rows={10}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-[#2EE8F1]/60"
                placeholder="Paste the target role here..."
              />

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={isBusy || !file}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#2EE8F1] px-4 py-3 font-bold text-[#11152D] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingAction === "analysis" ? <FiRefreshCw className="animate-spin" /> : <FiBarChart2 />}
                  Analyze CV
                </button>
                <button
                  type="button"
                  onClick={runTailoring}
                  disabled={isBusy || !file}
                  className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] px-4 py-3 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingAction === "tailor" ? <FiRefreshCw className="animate-spin" /> : <FiFileText />}
                  Tailor CV
                </button>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </aside>

            <section className="min-w-0">
              {!analysis && !tailoredCv ? (
                <EmptyState />
              ) : (
                <div className="grid gap-6">
                  {analysis && (
                    <div className="rounded-2xl border border-white/10 bg-[#0B0F19]/70 p-5 shadow-2xl">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-2xl font-bold">Analysis</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">{analysis.summary}</p>
                        </div>
                        <div className="grid min-w-56 grid-cols-2 gap-3">
                          <ScorePill label="CV" score={analysis.overall_cv_score} />
                          <ScorePill label="Match" score={analysis.job_alignment_score} />
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {sectionLabels.map(([key, label]) => (
                          <SectionScore key={key} label={label} section={analysis.cv_analysis[key]} />
                        ))}
                      </div>

                      <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <h3 className="font-semibold text-white">Matched Keywords</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {analysis.job_match_analysis.matched_keywords.length > 0 ? (
                              analysis.job_match_analysis.matched_keywords.map((keyword) => (
                                <span key={keyword} className="rounded-lg bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                                  {keyword}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-white/50">No matched keywords returned.</span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <h3 className="font-semibold text-white">Missing Skills</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {analysis.job_match_analysis.missing_critical_skills.length > 0 ? (
                              analysis.job_match_analysis.missing_critical_skills.map((skill) => (
                                <span key={skill} className="rounded-lg bg-red-400/10 px-3 py-1 text-sm text-red-200">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-white/50">No critical gaps returned.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        {analysis.recommendations.map((item) => (
                          <div key={`${item.priority}-${item.action}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="rounded-lg bg-[#5975E2]/20 px-2.5 py-1 text-xs font-bold text-[#9FB1FF]">
                              {item.priority}
                            </span>
                            <h3 className="mt-3 font-semibold text-white">{item.action}</h3>
                            <p className="mt-2 text-sm leading-6 text-white/65">{item.details}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <h3 className="font-semibold text-white">Skill Gap Analysis</h3>
                        <div className="mt-3 grid gap-3">
                          {analysis.job_match_analysis.skill_gap_analysis.map((gap) => (
                            <div key={`${gap.skill}-${gap.status}`} className="rounded-xl bg-[#11152D] p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-white">{gap.skill}</span>
                                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70">
                                  {formatLabel(gap.status)}
                                </span>
                                <span className="rounded-lg bg-[#E240CA]/15 px-2 py-1 text-xs text-[#F6B6EC]">
                                  {formatLabel(gap.priority)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-white/65">{gap.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {tailoredCv && (
                    <div className="rounded-2xl border border-white/10 bg-[#0B0F19]/70 p-5 shadow-2xl">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-emerald-300">
                            <FiCheckCircle />
                            <span className="text-sm font-semibold uppercase">Tailored</span>
                          </div>
                          <h2 className="mt-2 text-2xl font-bold">Generated CV</h2>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <a
                            href={getTailoredCvDownloadUrl(tailoredCv.cv_id, "pdf")}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white transition hover:bg-white/10"
                          >
                            <FiDownload />
                            PDF
                          </a>
                          <a
                            href={getTailoredCvDownloadUrl(tailoredCv.cv_id, "docx")}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white transition hover:bg-white/10"
                          >
                            <FiDownload />
                            DOCX
                          </a>
                        </div>
                      </div>

                      <pre className="mt-5 max-h-[720px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#11152D] p-5 text-sm leading-7 text-white/80">
                        {tailoredCv.tailored_cv_markdown}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default CVAssistant;
