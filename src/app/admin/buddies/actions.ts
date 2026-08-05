"use server";

import { revalidatePath } from "next/cache";
import {
  hideBuddy,
  unhideBuddy,
  createDbBuddy,
  updateDbBuddy,
  deleteDbBuddy,
  type DbBuddy,
} from "@/lib/db";

export async function hideBuddyAction(id: string): Promise<void> {
  await hideBuddy(id);
  revalidatePath("/admin/buddies");
  revalidatePath("/marketplace");
}

export async function unhideBuddyAction(id: string): Promise<void> {
  await unhideBuddy(id);
  revalidatePath("/admin/buddies");
  revalidatePath("/marketplace");
}

export async function createBuddyAction(payload: Partial<DbBuddy>): Promise<DbBuddy> {
  const newBuddy = await createDbBuddy(payload);
  revalidatePath("/admin/buddies");
  revalidatePath("/admin/overview");
  revalidatePath("/marketplace");
  return newBuddy;
}

export async function updateBuddyAction(id: string, payload: Partial<DbBuddy>): Promise<DbBuddy> {
  const updatedBuddy = await updateDbBuddy(id, payload);
  revalidatePath("/admin/buddies");
  revalidatePath("/admin/overview");
  revalidatePath("/marketplace");
  return updatedBuddy;
}

export async function deleteBuddyAction(id: string): Promise<void> {
  await deleteDbBuddy(id);
  revalidatePath("/admin/buddies");
  revalidatePath("/admin/overview");
  revalidatePath("/marketplace");
}
