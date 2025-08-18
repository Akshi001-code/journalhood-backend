// @ts-nocheck
import { Request, Response } from "express";
import admin from "../config/firebase.config";
import { transporter } from "../config/nodemailer.config";
import { TMailValidator } from "../validators/main.validator";
import { Timestamp } from "firebase-admin/firestore";
import { ImapFlow } from "imapflow";

// Create a demo request (public)
export const createDemoRequest = async (req: Request, res: Response) => {
  try {
    const {
      firstname,
      lastname,
      institutionName,
      workEmail,
      phone,
      role,
      numberOfStudents,
      message,
    }: TMailValidator = req.body;

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
      status: "new" as const,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await admin.firestore().collection("demoRequests").add(payload);

    // Send confirmation email to the requester (via Titan/Gmail/etc.)
    if (transporter) {
      const fromAddress =
        process.env.TITAN_EMAIL ||
        (process.env as any).titanemail ||
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
        await transporter.sendMail({ from: fromAddress, to: workEmail, subject, html });
      } catch (e) {
        console.warn("Failed to send confirmation email to requester:", e);
      }

      // Notify internal mailbox
      try {
        await transporter.sendMail({
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
      } catch (e) {
        console.warn("Failed to send internal notification email:", e);
      }
    }

    return res.status(201).json({ message: "Request submitted", id: docRef.id });
  } catch (error) {
    console.error("Error creating demo request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// List demo requests (super-admin only)
export const getDemoRequests = async (_req: Request, res: Response) => {
  try {
    const snap = await admin.firestore().collection("demoRequests").orderBy("createdAt", "desc").get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ requests: items });
  } catch (error) {
    console.error("Error fetching demo requests:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Optional: fetch recent emails from Titan inbox (Super Admin)
export const getInboxEmails = async (_req: Request, res: Response) => {
  try {
    const email = process.env.TITAN_EMAIL || process.env.EMAIL;
    const password = process.env.TITAN_EMAIL_PASSWORD || process.env.EMAIL_PASSWORD;
    if (!email || !password) return res.status(400).json({ error: "Email credentials missing" });

    const client = new ImapFlow({
      host: 'imap.titan.email',
      port: 993,
      secure: true,
      auth: { user: email, pass: password },
    });

    await client.connect();
    await client.mailboxOpen('INBOX');

    const messages: any[] = [];
    // fetch last 20 messages headers
    for await (const msg of client.fetch({ seq: `${Math.max(client.mailbox.exists - 19, 1)}:*` }, { envelope: true, internalDate: true, source: false })) {
      messages.push({
        uid: msg.uid,
        subject: msg.envelope?.subject || '',
        from: msg.envelope?.from?.map((a:any)=>`${a.name || ''} <${a.address}>`).join(', ') || '',
        date: msg.internalDate,
      });
    }

    await client.logout();
    return res.status(200).json({ emails: messages.reverse() });
  } catch (error) {
    console.error('Failed to fetch inbox:', error);
    return res.status(500).json({ error: 'Failed to fetch inbox' });
  }
}


