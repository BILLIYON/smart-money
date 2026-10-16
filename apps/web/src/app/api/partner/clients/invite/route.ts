import { NextRequest, NextResponse } from "next/server";
import { requirePartnerStaff } from "@/lib/partner-auth";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { email, fullName } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  try {
    const serviceRes = await partnerServiceClient.inviteClient({
      email,
      fullName,
      orgId: session.partnerOrgId,
    });

    // Send personalized SES email
    const inviteLink = serviceRes.inviteUrl || `https://smartmoney.technology/partners/${session.partnerOrgSlug}?invite=true`;
    const subject = `Invitation: Connect with ${session.partnerOrgName} on Smart Money`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1e293b;">
        <h2 style="color: #0f172a; margin-bottom: 16px;">Financial Advisory Invitation</h2>
        <p style="font-size: 15px; line-height: 1.6;">Hello ${fullName || "there"},</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Your wealth advisor at <strong>${session.partnerOrgName}</strong> has invited you to connect your Smart Money portfolio.
        </p>
        <div style="margin: 28px 0;">
          <a href="${inviteLink}" style="background-color: #00C48C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Accept & View Firm Profile
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
          You remain in full control of your data. You can inspect or toggle shared financial scopes at any time under your Smart Money Privacy Settings.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject,
      html: htmlBody,
    }).catch((emailErr) => {
      console.warn("[inviteClient] SES email send non-blocking warning:", emailErr);
    });

    return NextResponse.json({
      success: true,
      message: `Invitation successfully sent to ${email}`,
      inviteUrl: inviteLink,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send invitation" }, { status: 500 });
  }
}
