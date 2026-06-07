const nodemailer = require("nodemailer");

const EMAIL_MODE = (process.env.EMAIL_MODE || "console").toLowerCase();
const EMAIL_FROM = process.env.EMAIL_FROM || "CareerGenie HR <no-reply@careergenie.local>";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "";

let smtpTransporter = null;

function getTransporter() {
  if (smtpTransporter) return smtpTransporter;

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  return smtpTransporter;
}

function textToHtml(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendWithResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required when EMAIL_MODE=resend.");
  }

  const resendPayload = {
    from: EMAIL_FROM,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
    ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {}),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resendPayload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend email failed with status ${response.status}: ${body}`);
  }

  return response.json().catch(() => ({ mode: "resend" }));
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    console.warn(`[HR Email] Skipped "${subject}" because candidate email is missing.`);
    return { skipped: true, reason: "missing_recipient" };
  }

  const payload = {
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html: html || textToHtml(text),
    ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
  };

  if (EMAIL_MODE === "console") {
    console.log("\n========== HR EMAIL CONSOLE MODE ==========");
    console.log("To:", payload.to);
    console.log("Subject:", payload.subject);
    console.log("Text:\n" + payload.text);
    console.log("==========================================\n");
    return { mode: "console" };
  }

  if (EMAIL_MODE === "smtp") {
    return getTransporter().sendMail(payload);
  }

  if (EMAIL_MODE === "resend") {
    return sendWithResend({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

  console.warn(`[HR Email] Unsupported EMAIL_MODE="${EMAIL_MODE}". Email skipped.`);
  return { skipped: true, reason: "unsupported_mode" };
}

function candidateName(ctx) {
  return ctx.candidate_name || ctx.name || "Candidate";
}

function companyName(ctx) {
  return ctx.workspace_name || ctx.company_name || "the hiring team";
}

function jobTitle(ctx) {
  return ctx.job_title || ctx.title || "the role";
}

async function sendAIInterviewInvitationEmail(ctx) {
  const subject = `AI interview invitation for ${jobTitle(ctx)}`;
  const text = [
    `Hi ${candidateName(ctx)},`,
    `${companyName(ctx)} has invited you to complete an AI interview for ${jobTitle(ctx)}.`,
    ctx.start_time ? `Interview window starts: ${formatDate(ctx.start_time)}` : "",
    ctx.end_time ? `Interview window ends: ${formatDate(ctx.end_time)}` : "",
    `Open your interview link here: ${ctx.invitation_url}`,
    "Please complete the interview using a quiet environment with a working camera and microphone.",
    "Thank you,",
    "CareerGenie HR",
  ].filter(Boolean).join("\n\n");

  return sendEmail({ to: ctx.candidate_email || ctx.email, subject, text });
}

async function sendLiveInterviewInvitationEmail(ctx) {
  const subject = `Live interview invitation for ${jobTitle(ctx)}`;
  const text = [
    `Hi ${candidateName(ctx)},`,
    `${companyName(ctx)} has scheduled a live interview for ${jobTitle(ctx)}.`,
    ctx.scheduled_at ? `Scheduled time: ${formatDate(ctx.scheduled_at)}` : "",
    `Open your live interview link here: ${ctx.room_url}`,
    "The room will become available once the HR interviewer starts the session.",
    "Please join from a quiet environment with a working camera and microphone.",
    "Thank you,",
    "CareerGenie HR",
  ].filter(Boolean).join("\n\n");

  return sendEmail({ to: ctx.candidate_email || ctx.email, subject, text });
}

async function sendRejectionDecisionEmail(ctx) {
  const subject = `Update regarding your application for ${jobTitle(ctx)}`;
  const text = [
    `Hi ${candidateName(ctx)},`,
    `Thank you for your interest in ${jobTitle(ctx)} with ${companyName(ctx)}.`,
    "After reviewing your application, the hiring team has decided not to move forward at this time.",
    "We appreciate the time you invested and wish you the best in your job search.",
    "Thank you,",
    "CareerGenie HR",
  ].join("\n\n");

  return sendEmail({ to: ctx.candidate_email || ctx.email, subject, text });
}

async function sendHiringDecisionEmail(ctx) {
  const subject = `Congratulations regarding ${jobTitle(ctx)}`;
  const text = [
    `Hi ${candidateName(ctx)},`,
    `Congratulations. ${companyName(ctx)} has selected you for ${jobTitle(ctx)}.`,
    "The hiring team will contact you with the next steps and any remaining details.",
    "Thank you,",
    "CareerGenie HR",
  ].join("\n\n");

  return sendEmail({ to: ctx.candidate_email || ctx.email, subject, text });
}

async function sendWorkspaceInvitationEmail(ctx) {
  const subject = `Invitation to join ${companyName(ctx)} on CareerGenie`;
  const text = [
    `Hi ${candidateName(ctx)},`,
    `${ctx.inviter_name || "A team member"} has invited you to join ${companyName(ctx)} on CareerGenie.`,
    `Open your invitation here: ${ctx.invitation_url}`,
    "You will be asked to set your password before accessing the workspace.",
    "Thank you,",
    "CareerGenie HR",
  ].join("\n\n");

  return sendEmail({ to: ctx.email, subject, text });
}

module.exports = {
  sendAIInterviewInvitationEmail,
  sendLiveInterviewInvitationEmail,
  sendRejectionDecisionEmail,
  sendHiringDecisionEmail,
  sendWorkspaceInvitationEmail,
};
