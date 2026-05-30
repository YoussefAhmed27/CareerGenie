import axios from "axios";

export type AnalysisSection = {
  score: number;
  feedback: string;
};

export type CVAnalysisResult = {
  overall_cv_score: number;
  job_alignment_score: number;
  summary: string;
  cv_analysis: {
    ats_compatibility: AnalysisSection;
    structure: AnalysisSection;
    skills_section: AnalysisSection;
    education: AnalysisSection;
    experience: AnalysisSection;
    contact_info: AnalysisSection;
    professional_summary: AnalysisSection;
  };
  job_match_analysis: {
    matched_keywords: string[];
    missing_critical_skills: string[];
    seniority_fit: "High" | "Medium" | "Low" | "N/A";
    match_explanation: string;
    skill_gap_analysis: Array<{
      skill: string;
      status: "missing" | "weak" | "unverified";
      priority: "high" | "medium" | "low";
      explanation: string;
    }>;
  };
  qualitative_assessment: {
    strengths: Array<{ title: string; detail: string }>;
    weaknesses: Array<{ title: string; detail: string }>;
  };
  recommendations: Array<{
    priority: "High" | "Medium" | "Low";
    action: string;
    details: string;
  }>;
  tailoring_tips: string;
};

export type TailoringResponse = {
  cv_id: string;
  tailored_cv_markdown: string;
};

export type CandidateProfileInput = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  target_role: string;
  skills: string[];
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  experience: Array<{
    job_title: string;
    company: string;
    year: string;
    location: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    bullets: string[];
  }>;
  certifications: string[];
  languages: string[];
};

export type CVGenerationRequest = {
  structured: CandidateProfileInput;
  extra_info: string;
};

export type GeneratedCVResponse = {
  cv_id: string;
  generated_cv: unknown;
  generated_cv_markdown: string;
};

type ApiErrorPayload = {
  detail?: string;
  error?: string;
};

const cvClient = axios.create({
  baseURL: "",
});

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.detail || error.response?.data?.error || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const buildUploadBody = (file: File, jdText: string) => {
  const formData = new FormData();
  formData.append("file", file);

  if (jdText.trim()) {
    formData.append("jd_text", jdText.trim());
  }

  return formData;
};

export const analyzeCv = async (file: File, jdText: string) => {
  try {
    const response = await cvClient.post<CVAnalysisResult>(
      "/cv/upload",
      buildUploadBody(file, jdText),
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to analyze CV."));
  }
};

export const tailorCv = async (file: File, jdText: string) => {
  try {
    const response = await cvClient.post<TailoringResponse>(
      "/tailor/upload",
      buildUploadBody(file, jdText),
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to tailor CV."));
  }
};

export const getTailoredCvDownloadUrl = (cvId: string, format: "pdf" | "docx") =>
  `/tailor/download/${format}?cv_id=${encodeURIComponent(cvId)}`;

export const generateCvFromScratch = async (payload: CVGenerationRequest) => {
  try {
    const response = await cvClient.post<GeneratedCVResponse>(
      "/generation/generate",
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to generate CV."));
  }
};

export const getGeneratedCvDownloadUrl = (cvId: string, format: "pdf" | "docx") =>
  `/generation/download/${format}?cv_id=${encodeURIComponent(cvId)}`;
