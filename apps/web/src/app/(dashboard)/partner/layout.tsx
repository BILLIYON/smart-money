import type { Metadata } from "next";
import { getPartnerStaffSession } from "@/lib/partner-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Partner Portal · Smart Money" };
export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getPartnerStaffSession();

  if (!session) {
    redirect("/partners");
  }

  return <>{children}</>;
}

