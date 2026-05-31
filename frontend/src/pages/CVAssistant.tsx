import { useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheckCircle,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiRefreshCw,
  FiTarget,
  FiUploadCloud,
} from "react-icons/fi";
import Navbar from "../components/Navbar/Navbar";
import {
  analyzeCv,
  generateCvFromScratch,
  getGeneratedCvDownloadUrl,
  getTailoredCvDownloadUrl,
  tailorCv,
  type AnalysisSection,
  type CVAnalysisResult,
  type CandidateProfileInput,
  type GeneratedCVResponse,
  type TailoringResponse,
} from "../api/cvService";

type LoadingAction = "analysis" | "tailor" | "generation" | null;
type WorkspaceMode = "existing" | "scratch";

type ScratchForm = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  targetRole: string;
  skills: string;
  education: string;
  experience: string;
  projects: string;
  certifications: string;
  languages: string;
  extraInfo: string;
};

const emptyScratchForm: ScratchForm = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  targetRole: "",
  skills: "",
  education: "",
  experience: "",
  projects: "",
  certifications: "",
  languages: "",
  extraInfo: "",
};

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

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const splitList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const splitBullets = (value: string | undefined) =>
  (value || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

const buildGenerationProfile = (form: ScratchForm): CandidateProfileInput => ({
  name: form.name.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  linkedin: form.linkedin.trim(),
  target_role: form.targetRole.trim(),
  skills: splitList(form.skills),
  education: splitLines(form.education).map((line) => {
    const [degree = "", institution = "", year = ""] = line.split("|").map((part) => part.trim());
    return { degree, institution, year };
  }),
  experience: splitLines(form.experience).map((line) => {
    const [jobTitle = "", company = "", year = "", location = "", bullets = ""] = line
      .split("|")
      .map((part) => part.trim());
    return {
      job_title: jobTitle,
      company,
      year,
      location,
      bullets: splitBullets(bullets),
    };
  }),
  projects: splitLines(form.projects).map((line) => {
    const [name = "", bullets = ""] = line.split("|").map((part) => part.trim());
    return { name, bullets: splitBullets(bullets) };
  }),
  certifications: splitList(form.certifications),
  languages: splitList(form.languages),
});

const hasScratchInput = (form: ScratchForm) =>
  Object.values(form).some((value) => value.trim().length > 0);

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

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <label className="block text-sm font-semibold text-white/80">
    {label}
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#2EE8F1]/60"
    />
  </label>
);

const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) => (
  <label className="block text-sm font-semibold text-white/80">
    {label}
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-[#2EE8F1]/60"
    />
  </label>
);

const MarkdownResult = ({
  title,
  label,
  markdown,
  cvId,
  downloadUrl,
}: {
  title: string;
  label: string;
  markdown: string;
  cvId: string;
  downloadUrl: (cvId: string, format: "pdf" | "docx") => string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-[#0B0F19]/70 p-5 shadow-2xl">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-emerald-300">
          <FiCheckCircle />
          <span className="text-sm font-semibold uppercase">{label}</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={downloadUrl(cvId, "pdf")}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white transition hover:bg-white/10"
        >
          <FiDownload />
          PDF
        </a>
        <a
          href={downloadUrl(cvId, "docx")}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white transition hover:bg-white/10"
        >
          <FiDownload />
          DOCX
        </a>
      </div>
    </div>

    <pre className="mt-5 max-h-[720px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#11152D] p-5 text-sm leading-7 text-white/80 [scrollbar-color:#30364f_#11152D] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-[#11152D] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#30364f]">
      {markdown}
    </pre>
  </div>
);

const CVAssistant = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>("existing");
  const [file, setFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [scratchForm, setScratchForm] = useState<ScratchForm>(emptyScratchForm);
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [tailoredCv, setTailoredCv] = useState<TailoringResponse | null>(null);
  const [generatedCv, setGeneratedCv] = useState<GeneratedCVResponse | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState("");

  const isBusy = loadingAction !== null;

  const updateScratchField = (field: keyof ScratchForm, value: string) => {
    setScratchForm((current) => ({ ...current, [field]: value }));
  };

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    setError("");
  };

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

  const runGeneration = async () => {
    if (!hasScratchInput(scratchForm)) {
      setError("Add candidate details first.");
      return;
    }

    setLoadingAction("generation");
    setError("");

    try {
      const result = await generateCvFromScratch({
        structured: buildGenerationProfile(scratchForm),
        extra_info: scratchForm.extraInfo.trim(),
      });
      setGeneratedCv(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate CV.");
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
              <span>{mode === "existing" ? "Analysis and tailoring" : "Create from scratch"}</span>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="self-start rounded-2xl border border-white/10 bg-[#0B0F19]/70 p-5 shadow-2xl">
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("existing")}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    mode === "existing" ? "bg-[#2EE8F1] text-[#11152D]" : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <FiUploadCloud />
                  Existing CV
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("scratch")}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    mode === "scratch" ? "bg-[#2EE8F1] text-[#11152D]" : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <FiEdit3 />
                  New CV
                </button>
              </div>

              {mode === "existing" ? (
                <>
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

                  <div className="mt-6">
                    <TextAreaField
                      label="Job Description"
                      value={jdText}
                      onChange={setJdText}
                      placeholder="Paste the target role here..."
                      rows={10}
                    />
                  </div>

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
                </>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <TextField label="Name" value={scratchForm.name} onChange={(value) => updateScratchField("name", value)} />
                    <TextField
                      label="Target Role"
                      value={scratchForm.targetRole}
                      onChange={(value) => updateScratchField("targetRole", value)}
                    />
                    <TextField
                      label="Email"
                      value={scratchForm.email}
                      onChange={(value) => updateScratchField("email", value)}
                      type="email"
                    />
                    <TextField label="Phone" value={scratchForm.phone} onChange={(value) => updateScratchField("phone", value)} />
                  </div>
                  <TextField
                    label="LinkedIn"
                    value={scratchForm.linkedin}
                    onChange={(value) => updateScratchField("linkedin", value)}
                  />
                  <TextAreaField
                    label="Skills"
                    value={scratchForm.skills}
                    onChange={(value) => updateScratchField("skills", value)}
                    placeholder="React, Node.js, PostgreSQL"
                    rows={3}
                  />
                  <TextAreaField
                    label="Education"
                    value={scratchForm.education}
                    onChange={(value) => updateScratchField("education", value)}
                    placeholder="BSc Computer Science | AAST | 2026"
                    rows={3}
                  />
                  <TextAreaField
                    label="Experience"
                    value={scratchForm.experience}
                    onChange={(value) => updateScratchField("experience", value)}
                    placeholder="Frontend Intern | Company | 2025 | Cairo | Built dashboards; Improved load time"
                    rows={4}
                  />
                  <TextAreaField
                    label="Projects"
                    value={scratchForm.projects}
                    onChange={(value) => updateScratchField("projects", value)}
                    placeholder="CareerGenie | Built CV assistant; Integrated API"
                    rows={4}
                  />
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <TextAreaField
                      label="Certifications"
                      value={scratchForm.certifications}
                      onChange={(value) => updateScratchField("certifications", value)}
                      rows={3}
                    />
                    <TextAreaField
                      label="Languages"
                      value={scratchForm.languages}
                      onChange={(value) => updateScratchField("languages", value)}
                      rows={3}
                    />
                  </div>
                  <TextAreaField
                    label="Extra Info"
                    value={scratchForm.extraInfo}
                    onChange={(value) => updateScratchField("extraInfo", value)}
                    rows={5}
                  />
                  <button
                    type="button"
                    onClick={runGeneration}
                    disabled={isBusy || !hasScratchInput(scratchForm)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] px-4 py-3 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingAction === "generation" ? <FiRefreshCw className="animate-spin" /> : <FiEdit3 />}
                    Generate CV
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </aside>

            <section className="min-w-0">
              {!analysis && !tailoredCv && !generatedCv ? (
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
                    <MarkdownResult
                      title="Generated CV"
                      label="Tailored"
                      markdown={tailoredCv.tailored_cv_markdown}
                      cvId={tailoredCv.cv_id}
                      downloadUrl={getTailoredCvDownloadUrl}
                    />
                  )}

                  {generatedCv && (
                    <MarkdownResult
                      title="Generated CV"
                      label="Created"
                      markdown={generatedCv.generated_cv_markdown}
                      cvId={generatedCv.cv_id}
                      downloadUrl={getGeneratedCvDownloadUrl}
                    />
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
