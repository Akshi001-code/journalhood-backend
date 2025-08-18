"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailController = void 0;
const nodemailer_config_1 = require("../config/nodemailer.config");
const mailController = async (req, res) => {
    try {
        const { firstname, lastname, institutionName, workEmail, phone, role, numberOfStudents, message, } = req.body;
        if (!nodemailer_config_1.transporter) {
            return res.status(500).json({
                error: "Email transporter not configured",
                details: "Set TITAN_EMAIL/TITAN_EMAIL_PASSWORD (or EMAIL/EMAIL_PASSWORD) in environment variables",
            });
        }
        const fromAddress = process.env.TITAN_EMAIL ||
            process.env.titanemail ||
            process.env.EMAIL ||
            "noreply@journalhood.com";
        await nodemailer_config_1.transporter.sendMail({
            from: fromAddress,
            to: workEmail,
            subject: "Thanks for requesting a JournalHood demo",
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2 style="margin: 0 0 12px;">Hi ${firstname},</h2>
          <p>Thanks for your interest in JournalHood. Our team will reach out shortly to schedule your demo and discuss how we can support ${institutionName}.</p>
          <p style="margin: 16px 0 8px; font-weight: 600;">Your submission</p>
          <ul style="margin: 0; padding-left: 18px;">
            <li><strong>Name</strong>: ${firstname} ${lastname}</li>
            <li><strong>Institution</strong>: ${institutionName}</li>
            <li><strong>Role</strong>: ${role}</li>
            <li><strong>Phone</strong>: ${phone}</li>
            <li><strong>Students</strong>: ${numberOfStudents}</li>
            ${message ? `<li><strong>Message</strong>: ${message}</li>` : ""}
          </ul>
          <p style="margin-top: 16px;">If you didn’t request this, please ignore this email.</p>
          <p style="margin-top: 24px;">— JournalHood Team</p>
        </div>
      `,
        });
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.log("Error while sending mail", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
exports.mailController = mailController;
//# sourceMappingURL=mail.controller.js.map