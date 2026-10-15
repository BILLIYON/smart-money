"use server";

import { revalidatePath } from "next/cache";
import {
  approveBuddy,
  requestBuddyRevision,
  flagBuddyViolation,
  rejectBuddy,
  updateDbBuddy,
  DbBuddy,
} from "@/lib/db";

export async function approveBuddyAction(id: string): Promise<void> {
  await approveBuddy(id);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/buddies");
  revalidatePath("/admin/overview");
  revalidatePath("/marketplace");
}

export async function requestBuddyRevisionAction(id: string, feedback: string): Promise<void> {
  await requestBuddyRevision(id, feedback);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/buddies");
  revalidatePath("/admin/overview");
}

export async function flagBuddyViolationAction(id: string, reason: string): Promise<void> {
  await flagBuddyViolation(id, reason);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/buddies");
  revalidatePath("/admin/overview");
}

export async function rejectBuddyAction(id: string, reason: string): Promise<void> {
  await rejectBuddy(id, reason);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/buddies");
  revalidatePath("/admin/overview");
}

export async function updateBuddyByAdminAction(id: string, payload: Partial<DbBuddy>): Promise<void> {
  await updateDbBuddy(id, payload);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/buddies");
  revalidatePath("/marketplace");
}
