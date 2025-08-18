"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInboxEmails = exports.getDemoRequests = exports.createDemoRequest = void 0;
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
const nodemailer_config_1 = require("../config/nodemailer.config");
const firestore_1 = require("firebase-admin/firestore");
const imapflow_1 = require("imapflow");
// Create a demo request (public)
const createDemoRequest = async (req, res) => {
    try {
        const { firstname, lastname, institutionName, workEmail, phone, role, numberOfStudents, message, } = req.body;
        // Save to Firestore
        const payload = {
            firstName: firstname,
            lastName: lastname,
            institutionName,
            workEmail,
            phone,
            role,
            numberOfStudents,
            message: message || "",
            status: "new",
            createdAt: firestore_1.Timestamp.now(),
            updatedAt: firestore_1.Timestamp.now(),
        };
        const docRef = await firebase_config_1.default.firestore().collection("demoRequests").add(payload);
        // Send confirmation email to the requester (via Titan/Gmail/etc.)
        if (nodemailer_config_1.transporter) {
            const fromAddress = process.env.TITAN_EMAIL ||
                process.env.titanemail ||
                process.env.EMAIL ||
                "noreply@journalhood.com";
            const internalTo = process.env.TITAN_EMAIL || process.env.EMAIL || fromAddress;
            const subject = "Thanks for requesting a JournalHood demo";
            const html = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <div style="background:#3b82f6;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;">JournalHood</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;background:#fff;">
            <p>Hi ${firstname},</p>
            <p>Thank you for requesting a demo. Our team will reach out within 24 hours.</p>
            <p style="margin-top:16px;margin-bottom:8px;font-weight:bold;">Your details</p>
            <ul style="padding-left:18px;color:#374151;">
              <li>Institution: ${institutionName}</li>
              <li>Email: ${workEmail}</li>
              <li>Phone: ${phone}</li>
              <li>Role: ${role}</li>
              <li>Students: ${numberOfStudents}</li>
            </ul>
            ${message ? `<p style="margin-top:8px;"><strong>Message:</strong> ${message}</p>` : ""}
            <p style="margin-top:16px;">– The JournalHood Team</p>
          </div>
        </div>`;
            // Send to requester
            try {
                await nodemailer_config_1.transporter.sendMail({ from: fromAddress, to: workEmail, subject, html });
            }
            catch (e) {
                console.warn("Failed to send confirmation email to requester:", e);
            }
            // Notify internal mailbox
            try {
                await nodemailer_config_1.transporter.sendMail({
                    from: fromAddress,
                    to: internalTo,
                    subject: `New Demo Request – ${institutionName}`,
                    html: `
            <h3>New Demo Request</h3>
            <p><b>Name:</b> ${firstname} ${lastname}</p>
            <p><b>Institution:</b> ${institutionName}</p>
            <p><b>Email:</b> ${workEmail}</p>
            <p><b>Phone:</b> ${phone}</p>
            <p><b>Role:</b> ${role}</p>
            <p><b>Students:</b> ${numberOfStudents}</p>
            ${message ? `<p><b>Message:</b> ${message}</p>` : ""}
            <p><b>Request ID:</b> ${docRef.id}</p>
          `,
                });
            }
            catch (e) {
                console.warn("Failed to send internal notification email:", e);
            }
        }
        return res.status(201).json({ message: "Request submitted", id: docRef.id });
    }
    catch (error) {
        console.error("Error creating demo request:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.createDemoRequest = createDemoRequest;
// List demo requests (super-admin only)
const getDemoRequests = async (_req, res) => {
    try {
        const snap = await firebase_config_1.default.firestore().collection("demoRequests").orderBy("createdAt", "desc").get();
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return res.status(200).json({ requests: items });
    }
    catch (error) {
        console.error("Error fetching demo requests:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.getDemoRequests = getDemoRequests;
// Optional: fetch recent emails from Titan inbox (Super Admin)
const getInboxEmails = async (_req, res) => {
    try {
        const email = process.env.TITAN_EMAIL || process.env.EMAIL;
        const password = process.env.TITAN_EMAIL_PASSWORD || process.env.EMAIL_PASSWORD;
        if (!email || !password)
            return res.status(400).json({ error: "Email credentials missing" });
        const client = new imapflow_1.ImapFlow({
            host: 'imap.titan.email',
            port: 993,
            secure: true,
            auth: { user: email, pass: password },
        });
        await client.connect();
        await client.mailboxOpen('INBOX');
        const messages = [];
        // fetch last 20 messages headers
        for await (const msg of client.fetch({ seq: `${Math.max(client.mailbox.exists - 19, 1)}:*` }, { envelope: true, internalDate: true, source: false })) {
            messages.push({
                uid: msg.uid,
                subject: msg.envelope?.subject || '',
                from: msg.envelope?.from?.map((a) => `${a.name || ''} <${a.address}>`).join(', ') || '',
                date: msg.internalDate,
            });
        }
        await client.logout();
        return res.status(200).json({ emails: messages.reverse() });
    }
    catch (error) {
        console.error('Failed to fetch inbox:', error);
        return res.status(500).json({ error: 'Failed to fetch inbox' });
    }
};
exports.getInboxEmails = getInboxEmails;
//# sourceMappingURL=demo.controller.js.map