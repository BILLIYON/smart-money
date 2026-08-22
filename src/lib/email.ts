import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

function getSESClient() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = process.env.AWS_REGION?.trim() || "eu-north-1";

  return new SESClient({
    region,
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }
      : {}),
  });
}

function getDefaultSender() {
  return process.env.SES_FROM_EMAIL || "Smart Money <hi@smartmoney.technology>";
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export async function sendEmail({ to, subject, html, text, from }: SendEmailOptions) {
  const destination = Array.isArray(to) ? to : [to];
  const sender = from || getDefaultSender();
  const ses = getSESClient();

  const command = new SendEmailCommand({
    Source: sender,
    Destination: {
      ToAddresses: destination,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: html,
          Charset: "UTF-8",
        },
        ...(text && {
          Text: {
            Data: text,
            Charset: "UTF-8",
          },
        }),
      },
    },
  });

  try {
    const response = await ses.send(command);
    console.log(`[AWS SES] Email sent to ${destination.join(", ")} | MessageId: ${response.MessageId}`);
    return { success: true, messageId: response.MessageId };
  } catch (error: any) {
    console.error("[AWS SES] Error sending email:", error?.message || error);
    throw error;
  }
}

// ── Reusable HTML Email Templates ───────────────────────────

export function renderRegistrationOTPEmail(otpCode: string, fullName?: string): string {
  const name = fullName ? fullName.trim().split(" ")[0] : "there";
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Verify Account — Smart Money</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1528; color: #ffffff; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #13233d; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ffffff;">Smart <span style="color: #00c48c;">Money</span></span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #ffffff;">Verify Your Account</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
            Hi ${name}, enter the 6-digit verification code below to complete your registration:
          </p>
          <div style="background: rgba(0, 196, 140, 0.1); border: 1px solid rgba(0, 196, 140, 0.3); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #00c48c; font-family: monospace;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 24px;">
            This code is valid for <strong>15 minutes</strong>.
          </p>
        </div>
      </body>
    </html>
  `;
}

export function renderEmailChangeOTPEmail(otpCode: string, newEmail: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Confirm Email Change — Smart Money</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1528; color: #ffffff; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #13233d; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ffffff;">Smart <span style="color: #00c48c;">Money</span></span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #ffffff;">Confirm Email Change</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
            You requested to change your account email to <strong>${newEmail}</strong>. Use the code below to confirm:
          </p>
          <div style="background: rgba(0, 196, 140, 0.1); border: 1px solid rgba(0, 196, 140, 0.3); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #00c48c; font-family: monospace;">${otpCode}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderPhoneChangeOTPEmail(otpCode: string, phoneNumber: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Verify Phone Number — Smart Money</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1528; color: #ffffff; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #13233d; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ffffff;">Smart <span style="color: #00c48c;">Money</span></span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #ffffff;">Verify Phone Number</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
            Use the 6-digit verification code below to confirm updating your phone number to <strong>${phoneNumber}</strong>:
          </p>
          <div style="background: rgba(0, 196, 140, 0.1); border: 1px solid rgba(0, 196, 140, 0.3); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #00c48c; font-family: monospace;">${otpCode}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderProfileUpdateOTPEmail(otpCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Security Verification — Smart Money</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1528; color: #ffffff; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #13233d; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ffffff;">Smart <span style="color: #00c48c;">Money</span></span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #ffffff;">Profile Security Verification</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
            Use the 6-digit security code below to authorize your account profile updates:
          </p>
          <div style="background: rgba(0, 196, 140, 0.1); border: 1px solid rgba(0, 196, 140, 0.3); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #00c48c; font-family: monospace;">${otpCode}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderPasswordResetEmail(otpCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Reset Your Password — Smart Money</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1528; color: #ffffff; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #13233d; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ffffff;">Smart <span style="color: #00c48c;">Money</span></span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #ffffff;">Password Reset Request</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
            You recently requested to reset your password for your Smart Money account. Use the 6-digit verification code below:
          </p>
          <div style="background: rgba(0, 196, 140, 0.1); border: 1px solid rgba(0, 196, 140, 0.3); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #00c48c; font-family: monospace;">${otpCode}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderWelcomeEmail(fullName?: string | null): string {
  const name = fullName ? fullName.split(" ")[0] : "there";
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Welcome to Smart Money</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1528; color: #ffffff; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #13233d; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ffffff;">Smart <span style="color: #00c48c;">Money</span></span>
          </div>
          <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 12px; color: #ffffff;">Welcome aboard, ${name}! 👋</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
            Thank you for creating your Smart Money account. Your AI-powered finance team is ready to help you track expenses, analyze bank alerts, set financial goals, and build wealth.
          </p>
          <a href="https://smartmoney.technology/marketplace" style="display: inline-block; background: #00c48c; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; margin-bottom: 24px;">
            Explore AI Buddies
          </a>
        </div>
      </body>
    </html>
  `;
}

export function renderContactAlertEmail(senderName: string, senderEmail: string, subject: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background: #0b1528; color: #fff; padding: 30px;">
        <div style="max-width: 500px; margin: 0 auto; background: #13233d; padding: 24px; border-radius: 12px;">
          <h3 style="color: #00c48c; margin-top: 0;">New Support Inquiry</h3>
          <p><strong>From:</strong> ${senderName} (${senderEmail})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-top: 16px;">
            <p style="margin: 0; white-space: pre-wrap; color: #cbd5e1;">${message}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
