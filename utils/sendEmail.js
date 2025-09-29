// utils/email.js
const nodemailer = require("nodemailer");
console.log("SMTP_USER:", process.env.SMTP_MAIL);
console.log("SMTP_PASS:", process.env.SMTP_PASSWORD);
const dotenv = require("dotenv");
dotenv.config();
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.from] - Sender (default: SMTP_MAIL)
 */
const sendEmail = async ({ to, subject, html, from }) => {
  try {
    const mailOptions = {
      from: from || `"Team Board" <${process.env.SMTP_MAIL}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.response}`);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail };
