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
      console.warn(
        `Email not configured. Would send "${input.subject}" to ${input.to}`,
      );
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

  async sendAgencyAdminInvitation(input: {
    to: string;
    agencyName: string;
    invitationUrl: string;
  }) {
    return this.send({
      to: input.to,
      subject: "BondChain agency admin invitation",
      text: `You have been invited to register as the agency admin for ${input.agencyName}.\n\nOpen this link and verify with Bhutan NDI:\n${input.invitationUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>BondChain agency admin invitation</h2>
          <p>You have been invited to register as the agency admin for <strong>${input.agencyName}</strong>.</p>
          <p><a href="${input.invitationUrl}">Register with Bhutan NDI</a></p>
        </div>
      `,
    });
  }

  async sendAgencyOfficerInvitation(input: {
    to: string;
    agencyName: string;
    invitationUrl: string;
  }) {
    return this.send({
      to: input.to,
      subject: "BondChain agency officer invitation",
      text: `You have been invited to register as an officer for ${input.agencyName}.\n\nOpen this link and verify with Bhutan NDI:\n${input.invitationUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>BondChain agency officer invitation</h2>
          <p>You have been invited to register as an officer for <strong>${input.agencyName}</strong>.</p>
          <p><a href="${input.invitationUrl}">Register with Bhutan NDI</a></p>
        </div>
      `,
    });
  }

  async sendAgencyActionLink(input: {
    to: string;
    agencyName: string;
    serviceName: string;
    role: string;
    actionUrl: string;
  }) {
    return this.send({
      to: input.to,
      subject: `BondChain ${input.role.toLowerCase()} action required`,
      text: `A ${input.serviceName} request for ${input.agencyName} is ready for your ${input.role.toLowerCase()} action.\n\nOpen this link:\n${input.actionUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>BondChain action required</h2>
          <p>A <strong>${input.serviceName}</strong> request for <strong>${input.agencyName}</strong> is ready for your <strong>${input.role}</strong> action.</p>
          <p><a href="${input.actionUrl}">Open request</a></p>
        </div>
      `,
    });
  }

  async sendAgencyRequestCompleted(input: {
    to: string;
    serviceName: string;
    verificationLink?: string;
    certificateUrl?: string;
  }) {
    return this.send({
      to: input.to,
      subject: "BondChain agency request completed",
      text: `Your ${input.serviceName} request is complete.\n\nVerification: ${input.verificationLink || "Not available"}\nCertificate: ${input.certificateUrl || "Not available"}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>BondChain request completed</h2>
          <p>Your <strong>${input.serviceName}</strong> request is complete.</p>
          ${input.verificationLink ? `<p><a href="${input.verificationLink}">Open verification page</a></p>` : ""}
          ${input.certificateUrl ? `<p><a href="${input.certificateUrl}">Open issued certificate</a></p>` : ""}
        </div>
      `,
    });
  }

  async sendAgencyRequestActionUpdate(input: {
    to: string;
    agencyName: string;
    serviceName: string;
    role: string;
    status: string;
    reason?: string;
    verificationLink?: string;
  }) {
    return this.send({
      to: input.to,
      subject: `BondChain ${input.serviceName} request update`,
      text: `Your ${input.serviceName} request at ${input.agencyName} was updated.\n\nAction: ${input.role}\nStatus: ${input.status}${input.reason ? `\nReason: ${input.reason}` : ""}${input.verificationLink ? `\nVerification: ${input.verificationLink}` : ""}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>BondChain request update</h2>
          <p>Your <strong>${input.serviceName}</strong> request at <strong>${input.agencyName}</strong> was updated.</p>
          <p><strong>Action:</strong> ${input.role}</p>
          <p><strong>Status:</strong> ${input.status}</p>
          ${input.reason ? `<p><strong>Reason:</strong> ${input.reason}</p>` : ""}
          ${input.verificationLink ? `<p><a href="${input.verificationLink}">Open verification page</a></p>` : ""}
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
