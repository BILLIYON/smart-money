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
  const name = fullName ? fullName.trim().split(" ")[0] : "there";
  return renderComprehensiveWelcomeBroadcastEmail(fullName);
}

export function renderComprehensiveWelcomeBroadcastEmail(fullName?: string | null): string {
  const name = fullName ? fullName.trim().split(" ")[0] : "there";
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Smart Money — Your AI Financial Superpower</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080f1d; color: #f8fafc; margin: 0; padding: 40px 16px; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #0d2847 0%, #06192e 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid rgba(0, 196, 140, 0.2);">
            <div style="display: inline-block; margin-bottom: 16px;">
              <span style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Smart <span style="color: #00c48c;">Money</span></span>
            </div>
            <h1 style="font-size: 26px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">Welcome to the Future of Personal Wealth 👋</h1>
            <p style="font-size: 15px; color: #38bdf8; font-weight: 500; margin: 0;">Hi ${name}, your intelligent AI finance team is ready for action!</p>
          </div>

          <!-- Main Content Body -->
          <div style="padding: 36px 32px;">
            <p style="font-size: 15px; color: #94a3b8; margin-top: 0; margin-bottom: 24px;">
              We are thrilled to welcome you to <strong>Smart Money</strong>! You have officially unlocked access to a state-of-the-art financial platform engineered to automate your money management, optimize your investments, and build lasting wealth.
            </p>

            <!-- Feature Card 1 -->
            <div style="background: #1e293b; border-left: 4px solid #00c48c; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <div style="font-weight: 700; font-size: 16px; color: #00c48c; margin-bottom: 6px;">
                🤖 1. Specialized AI Financial Buddies & Advisors
              </div>
              <p style="font-size: 14px; color: #cbd5e1; margin: 0;">
                Connect with 24/7 autonomous AI Buddies like <strong>Move-E</strong>, Crypto Specialists, Budget Masters, and Tax Strategy Advisors customized to your exact financial targets.
              </p>
            </div>

            <!-- Feature Card 2 -->
            <div style="background: #1e293b; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <div style="font-weight: 700; font-size: 16px; color: #38bdf8; margin-bottom: 6px;">
                ⚡ 2. Automated Expense Tracking & Alert Parsing
              </div>
              <p style="font-size: 14px; color: #cbd5e1; margin: 0;">
                Instantly parse bank alerts, statements, and financial documents with AI accuracy. Track your cash flows in real-time without tedious manual entry.
              </p>
            </div>

            <!-- Feature Card 3 -->
            <div style="background: #1e293b; border-left: 4px solid #a855f7; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <div style="font-weight: 700; font-size: 16px; color: #c084fc; margin-bottom: 6px;">
                🎯 3. Smart Goal Engineering & Emergency Funds
              </div>
              <p style="font-size: 14px; color: #cbd5e1; margin: 0;">
                Set, track, and hit milestone financial goals—from buying your dream property to establishing automated emergency reserves and portfolio expansion.
              </p>
            </div>

            <!-- Feature Card 4 -->
            <div style="background: #1e293b; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
              <div style="font-weight: 700; font-size: 16px; color: #fbbf24; margin-bottom: 6px;">
                🔒 4. Bank-Grade Security & Full Data Privacy
              </div>
              <p style="font-size: 14px; color: #cbd5e1; margin: 0;">
                Your financial security is our top priority. Enjoy end-to-end encryption, multi-factor verification, and isolated data privacy across all devices.
              </p>
            </div>

            <!-- CTA Section -->
            <div style="text-align: center; margin: 32px 0 24px 0;">
              <a href="https://smartmoney.technology/dashboard" style="display: inline-block; background: linear-gradient(135deg, #00c48c 0%, #00a375 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0, 196, 140, 0.3);">
                Explore Smart Money Dashboard →
              </a>
            </div>

            <p style="font-size: 13px; color: #64748b; text-align: center; margin-bottom: 0;">
              Questions or need assistance? Reply directly to this email or reach out to our team at support@smartmoney.technology.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #090d16; padding: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #475569;">
            <p style="margin: 0 0 6px 0;">© 2026 Smart Money Technologies Inc. All rights reserved.</p>
            <p style="margin: 0;">You are receiving this email because you are a registered user of Smart Money.</p>
          </div>

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
