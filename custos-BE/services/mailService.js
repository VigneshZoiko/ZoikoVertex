const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");

const USE_SENDGRID = !!process.env.SENDGRID_API_KEY;

if (USE_SENDGRID) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("✅ Mail provider: SendGrid");
} else {
  // Local dev fallback — SMTP (nodemailer)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
  });

  transporter.verify((error) => {
    if (error) {
      console.warn("⚠️  SMTP unavailable (local dev only):", error.message);
    } else {
      console.log("✅ SMTP Server Ready");
    }
  });

  module._smtpTransporter = transporter;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendMail = async ({ to, from, subject, body, html }) => {
  if (!to || !subject) throw new Error("Missing required fields: to, subject");
  if (!emailRegex.test(to)) throw new Error("Invalid recipient email");
  if (from && !emailRegex.test(from)) throw new Error("Invalid sender email");

  const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || from;
  if (!fromAddress) throw new Error("No sender email configured and no 'from' provided");
  const textBody = body || "User has reported an issue. Please view this email in HTML format.";
  const htmlBody =
    html ||
    `<div style="font-family: Arial; padding: 10px;">
      <h3>User Issue</h3>
      <p>${textBody.replace(/\n/g, "<br/>")}</p>
    </div>`;

  if (USE_SENDGRID) {
    await sgMail.send({
      to,
      from: fromAddress,
      replyTo: from || fromAddress,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } else {
    await module._smtpTransporter.sendMail({
      from: fromAddress,
      replyTo: from,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
  }
};

module.exports = { sendMail };
