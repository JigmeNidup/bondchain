import nodemailer from "nodemailer";
import { getConfig } from "../config.js";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

class EmailService {
  private transporter() {
    const config = getConfig();
    if (!config.mail.gmailUser || !config.mail.gmailAppPassword) return null;

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.mail.gmailUser,
        pass: config.mail.gmailAppPassword,
      },
    });
  }

  private async send(input: SendMailInput) {
    const config = getConfig();
    const transporter = this.transporter();
    if (!transporter) {
      console.warn(`Email not configured. Would send "${input.subject}" to ${input.to}`);
      return { sent: false };
    }

    await transporter.sendMail({
      from: config.mail.from || config.mail.gmailUser,
      ...input,
    });
    return { sent: true };
  }

  async sendPeerSigningRequest(input: {
    to: string;
    requesterEmail: string;
    documentHash: string;
    signingUrl: string;
  }) {
    return this.send({
      to: input.to,
      subject: "BondChain document signature request",
      text: `You have been asked to sign a document on BondChain.\n\nDocument hash: ${input.documentHash}\nRequested by: ${input.requesterEmail}\n\nOpen this link to review and sign:\n${input.signingUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>BondChain document signature request</h2>
          <p>You have been asked to sign a document on BondChain.</p>
          <p><strong>Document hash:</strong><br><code>${input.documentHash}</code></p>
          <p><strong>Requested by:</strong> ${input.requesterEmail}</p>
          <p><a href="${input.signingUrl}">Review and sign document</a></p>
        </div>
      `,
    });
  }

  async sendPeerSigningCompleted(input: {
    to: string;
    targetEmail: string;
    documentHash: string;
    verificationLink: string;
  }) {
    return this.send({
      to: input.to,
      subject: "BondChain document signed",
      text: `Your BondChain document has been signed.\n\nDocument hash: ${input.documentHash}\nSigned by: ${input.targetEmail}\n\nVerify it here:\n${input.verificationLink}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>BondChain document signed</h2>
          <p>Your document has been signed.</p>
          <p><strong>Document hash:</strong><br><code>${input.documentHash}</code></p>
          <p><strong>Signed by:</strong> ${input.targetEmail}</p>
          <p><a href="${input.verificationLink}">Open verification page</a></p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
