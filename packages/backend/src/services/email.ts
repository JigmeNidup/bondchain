import nodemailer from "nodemailer";
import { getConfig } from "../config.js";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const LOGO_BASE64 =
  "data:image/png;base64,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";

const emailLayout = (_config: ReturnType<typeof getConfig>, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BondChain</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#ffffff;border-radius:16px;padding:12px 20px;border:1px solid #f1f5f9;">
                    <span style="font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">BondChain</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:20px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This is an automated message from BondChain.<br />
                Please do not reply to this email.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">
                © ${new Date().getFullYear()} BondChain · Powered by Bhutan NDI
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const actionButton = (href: string, label: string, color = "#3730a3") => `
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="background-color:${color};border-radius:12px;">
        <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

const hashBlock = (label: string, value: string) => `
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="background-color:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">${label}</p>
        <p style="margin:0;font-family:monospace;font-size:12px;color:#3730a3;word-break:break-all;">${value}</p>
      </td>
    </tr>
  </table>
`;

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
    const config = getConfig();
    return this.send({
      to: input.to,
      subject: "BondChain: Document signature request",
      text: `You have been asked to sign a document on BondChain.\n\nDocument hash: ${input.documentHash}\nRequested by: ${input.requesterEmail}\n\nOpen this link to review and sign:\n${input.signingUrl}`,
      html: emailLayout(
        config,
        `
        <!-- Top accent bar -->
        <tr><td style="background-color:#3730a3;height:4px;"></td></tr>

        <tr>
          <td style="padding:40px 40px 32px;">
            <!-- Icon -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#eef2ff;border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:18px;font-weight:900;color:#3730a3;letter-spacing:-0.5px;">B</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
              Signature Request
            </h1>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
              <strong style="color:#0f172a;">${input.requesterEmail}</strong> has invited you to sign a document on BondChain using your Bhutan NDI identity.
            </p>

            ${hashBlock("Document Hash", input.documentHash)}

            <div style="height:28px;"></div>

            ${actionButton(input.signingUrl, "Review & Sign Document")}

            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
              This link is unique to you and expires after signing.
            </p>
          </td>
        </tr>
      `
          .trim()
          .split("\n")
          .map(l => `          ${l}`)
          .join("\n"),
      ),
    });
  }

  async sendPeerSigningCompleted(input: {
    to: string;
    targetEmail: string;
    documentHash: string;
    verificationLink: string;
  }) {
    const config = getConfig();
    return this.send({
      to: input.to,
      subject: "BondChain: Document signed",
      text: `Your BondChain document has been signed.\n\nDocument hash: ${input.documentHash}\nSigned by: ${input.targetEmail}\n\nVerify it here:\n${input.verificationLink}`,
      html: emailLayout(
        config,
        `
        <tr><td style="background-color:#059669;height:4px;"></td></tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#d1fae5;border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:22px;line-height:48px;">✓</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
              Document Signed
            </h1>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
              Your document has been signed by <strong style="color:#0f172a;">${input.targetEmail}</strong>. The signature is permanently recorded on-chain.
            </p>

            ${hashBlock("Document Hash", input.documentHash)}

            <div style="height:28px;"></div>

            ${actionButton(input.verificationLink, "View Verification Proof", "#059669")}
          </td>
        </tr>
      `,
      ),
    });
  }

  async sendAgencyAdminInvitation(input: {
    to: string;
    agencyName: string;
    invitationUrl: string;
  }) {
    const config = getConfig();
    return this.send({
      to: input.to,
      subject: "BondChain: Agency admin invitation",
      text: `You have been invited to register as the agency admin for ${input.agencyName}.\n\nOpen this link and verify with Bhutan NDI:\n${input.invitationUrl}`,
      html: emailLayout(
        config,
        `
        <tr><td style="background-color:#3730a3;height:4px;"></td></tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#eef2ff;border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:18px;font-weight:900;color:#3730a3;letter-spacing:-0.5px;">B</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
              Admin Invitation
            </h1>
            <p style="margin:0 0 8px;font-size:14px;color:#64748b;line-height:1.6;">
              You have been invited to register as the <strong style="color:#0f172a;">Agency Admin</strong> for:
            </p>
            <p style="margin:0 0 28px;font-size:18px;font-weight:800;color:#3730a3;">${input.agencyName}</p>

            <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">
              Click the button below to complete your registration using your Bhutan NDI identity.
            </p>

            ${actionButton(input.invitationUrl, "Register with Bhutan NDI")}

            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
              This invitation link can only be used once.
            </p>
          </td>
        </tr>
      `,
      ),
    });
  }

  async sendAgencyOfficerInvitation(input: {
    to: string;
    agencyName: string;
    invitationUrl: string;
  }) {
    const config = getConfig();
    return this.send({
      to: input.to,
      subject: "BondChain: Agency officer invitation",
      text: `You have been invited to register as an officer for ${input.agencyName}.\n\nOpen this link and verify with Bhutan NDI:\n${input.invitationUrl}`,
      html: emailLayout(
        config,
        `
        <tr><td style="background-color:#3730a3;height:4px;"></td></tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#eef2ff;border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:18px;font-weight:900;color:#3730a3;letter-spacing:-0.5px;">B</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
              Officer Invitation
            </h1>
            <p style="margin:0 0 8px;font-size:14px;color:#64748b;line-height:1.6;">
              You have been invited to join as an <strong style="color:#0f172a;">Officer</strong> for:
            </p>
            <p style="margin:0 0 28px;font-size:18px;font-weight:800;color:#3730a3;">${input.agencyName}</p>

            <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">
              Click the button below to complete your registration using your Bhutan NDI identity.
            </p>

            ${actionButton(input.invitationUrl, "Register with Bhutan NDI")}

            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
              This invitation link can only be used once.
            </p>
          </td>
        </tr>
      `,
      ),
    });
  }

  async sendAgencyActionLink(input: {
    to: string;
    agencyName: string;
    serviceName: string;
    role: string;
    actionUrl: string;
  }) {
    const config = getConfig();
    return this.send({
      to: input.to,
      subject: `BondChain: Action required — ${input.serviceName}`,
      text: `A ${input.serviceName} request for ${input.agencyName} is ready for your ${input.role.toLowerCase()} action.\n\nOpen this link:\n${input.actionUrl}`,
      html: emailLayout(
        config,
        `
        <tr><td style="background-color:#f59e0b;height:4px;"></td></tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#fef3c7;border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:22px;line-height:48px;">!</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
              Action Required
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
              A <strong style="color:#0f172a;">${input.serviceName}</strong> request for <strong style="color:#0f172a;">${input.agencyName}</strong> is awaiting your <strong style="color:#0f172a;">${input.role}</strong> action.
            </p>

            ${actionButton(input.actionUrl, "Open Request", "#f59e0b")}
          </td>
        </tr>
      `,
      ),
    });
  }

  async sendAgencyRequestCompleted(input: {
    to: string;
    serviceName: string;
    verificationLink?: string;
    certificateUrl?: string;
  }) {
    const config = getConfig();
    return this.send({
      to: input.to,
      subject: `BondChain: ${input.serviceName} request completed`,
      text: `Your ${input.serviceName} request is complete.\n\nVerification: ${input.verificationLink || "Not available"}\nCertificate: ${input.certificateUrl || "Not available"}`,
      html: emailLayout(
        config,
        `
        <tr><td style="background-color:#059669;height:4px;"></td></tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#d1fae5;border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:22px;line-height:48px;">✓</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
              Request Completed
            </h1>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
              Your <strong style="color:#0f172a;">${input.serviceName}</strong> request has been fully processed and completed.
            </p>

            ${input.verificationLink ? actionButton(input.verificationLink, "View Verification Proof", "#059669") : ""}
            ${input.certificateUrl ? `<div style="height:12px;"></div>${actionButton(input.certificateUrl, "Download Certificate", "#3730a3")}` : ""}
          </td>
        </tr>
      `,
      ),
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
    const config = getConfig();
    const isApproved = input.status.toUpperCase() === "APPROVED" || input.status.toUpperCase() === "SIGNED";
    const accentColor = isApproved ? "#059669" : "#ef4444";
    const iconBg = isApproved ? "#d1fae5" : "#fee2e2";
    const icon = isApproved ? "✓" : "✕";

    return this.send({
      to: input.to,
      subject: `BondChain: ${input.serviceName} request update`,
      text: `Your ${input.serviceName} request at ${input.agencyName} was updated.\n\nAction: ${input.role}\nStatus: ${input.status}${input.reason ? `\nReason: ${input.reason}` : ""}${input.verificationLink ? `\nVerification: ${input.verificationLink}` : ""}`,
      html: emailLayout(
        config,
        `
        <tr><td style="background-color:${accentColor};height:4px;"></td></tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:${iconBg};border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:22px;line-height:48px;">${icon}</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
              Request Update
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
              Your <strong style="color:#0f172a;">${input.serviceName}</strong> request at <strong style="color:#0f172a;">${input.agencyName}</strong> has been updated.
            </p>

            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:16px 20px;">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding-bottom:10px;border-bottom:1px solid #f1f5f9;">
                        <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Action</span><br />
                        <span style="font-size:14px;font-weight:700;color:#0f172a;">${input.role}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:10px;">
                        <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Status</span><br />
                        <span style="font-size:14px;font-weight:700;color:${accentColor};">${input.status}</span>
                      </td>
                    </tr>
                    ${
                      input.reason
                        ? `
                    <tr>
                      <td style="padding-top:10px;border-top:1px solid #f1f5f9;">
                        <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Reason</span><br />
                        <span style="font-size:14px;color:#64748b;">${input.reason}</span>
                      </td>
                    </tr>`
                        : ""
                    }
                  </table>
                </td>
              </tr>
            </table>

            ${input.verificationLink ? actionButton(input.verificationLink, "View Verification Proof", accentColor) : ""}
          </td>
        </tr>
      `,
      ),
    });
  }
}

export const emailService = new EmailService();
