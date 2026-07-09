const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const nodemailer = require("nodemailer");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("✅ Mail provider: SMTP (" + process.env.SMTP_HOST + ")");
} else {
  console.warn("⚠️  SMTP not configured — emails will not be sent");
}

const sendMail = async ({ to, from, subject, body, html }) => {
  if (!to || !subject) throw new Error("Missing required fields: to, subject");
  if (!emailRegex.test(to)) throw new Error("Invalid recipient email");
  if (from && !emailRegex.test(from)) throw new Error("Invalid sender email");

  const fromAddress = process.env.FROM_EMAIL || from;
  if (!fromAddress) throw new Error("No sender email configured and no 'from' provided");
  if (!transporter) throw new Error("Mail service not configured (missing SMTP credentials)");

  const textBody = body || "User has reported an issue. Please view this email in HTML format.";
  const htmlBody =
    html ||
    `<div style="font-family: Arial; padding: 10px;">
      <h3>User Issue</h3>
      <p>${textBody.replace(/\n/g, "<br/>")}</p>
    </div>`;

  await transporter.sendMail({
    from: fromAddress,
    to,
    replyTo: from || fromAddress,
    subject,
    text: textBody,
    html: htmlBody,
  });
};

module.exports = { sendMail };