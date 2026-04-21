"use server";

import { revalidatePath } from "next/cache";
import { approveBuddy, rejectBuddy } from "@/lib/db";

export async function approveBuddyAction(id: string): Promise<void> {
  await approveBuddy(id);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/overview");
}

export async function rejectBuddyAction(id: string, reason: string): Promise<void> {
  await rejectBuddy(id, reason);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/overview");
}
