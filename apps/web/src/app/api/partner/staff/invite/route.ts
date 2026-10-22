import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const result = await partnerServiceClient.inviteStaff({
      partnerOrgId: staff.partnerOrgId,
      name,
      email,
      role: role || "advisor",
    });

    // Dispatch branded SES email
    try {
      const inviteUrl = result.inviteUrl || `https://smartmoney.technology/register?staffInvite=${result.inviteToken}`;
      await sendEmail({
        to: email,
        subject: `You've been invited to join ${staff.partnerOrgName} on Smart Money`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; background-color: #0b1528; color: #ffffff; border-radius: 14px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 24px; font-weight: bold; color: #00C48C;">Smart Money</span>
              <span style="font-size: 13px; color: #6B7A99; display: block; margin-top: 4px;">Institutional Wealth Partner Network</span>
            </div>
            <div style="background: rgba(255, 255, 255, 0.05); padding: 24px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="font-size: 18px; margin-top: 0; color: #ffffff;">Welcome, ${name}!</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #94A3B8;">
                You have been invited by <strong>${staff.fullName || staff.email}</strong> to join the wealth advisory team at <strong>${staff.partnerOrgName}</strong> as a <strong>${role || "Advisor"}</strong>.
              </p>
              <div style="margin: 28px 0; text-align: center;">
                <a href="${inviteUrl}" style="background-color: #00C48C; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block;">
                  Accept Staff Invitation →
                </a>
              </div>
              <p style="font-size: 12px; color: #64748B; margin-bottom: 0;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `Welcome, ${name}! You have been invited to join ${staff.partnerOrgName} as an advisor on Smart Money. Accept your invitation here: ${inviteUrl}`,
      });
    } catch (emailErr) {
      console.warn("[POST /api/partner/staff/invite] Email delivery notice:", emailErr);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/partner/staff/invite]", err);
    return NextResponse.json({ error: err.message || "Failed to invite staff member" }, { status: 500 });
  }
}
