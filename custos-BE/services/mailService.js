const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (resend) {
  console.log("✅ Mail provider: Resend");
} else {
  console.warn("⚠️  RESEND_API_KEY not configured — emails will not be sent");
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendMail = async ({ to, from, subject, body, html }) => {
  if (!to || !subject) throw new Error("Missing required fields: to, subject");
  if (!emailRegex.test(to)) throw new Error("Invalid recipient email");
  if (from && !emailRegex.test(from)) throw new Error("Invalid sender email");

  const fromAddress = process.env.FROM_EMAIL || from;
  if (!fromAddress) throw new Error("No sender email configured and no 'from' provided");
  if (!resend) throw new Error("Mail service not configured (missing RESEND_API_KEY)");

  const textBody = body || "User has reported an issue. Please view this email in HTML format.";
  const htmlBody =
    html ||
    `<div style="font-family: Arial; padding: 10px;">
      <h3>User Issue</h3>
      <p>${textBody.replace(/\n/g, "<br/>")}</p>
    </div>`;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    replyTo: from || fromAddress,
    subject,
    text: textBody,
    html: htmlBody,
  });

  if (error) throw new Error(error.message || "Failed to send email via Resend");
};

module.exports = { sendMail };
