"use server";

import { revalidatePath } from "next/cache";
import { hideBuddy, unhideBuddy } from "@/lib/db";

export async function hideBuddyAction(id: string): Promise<void> {
  await hideBuddy(id);
  revalidatePath("/admin/buddies");
}

export async function unhideBuddyAction(id: string): Promise<void> {
  await unhideBuddy(id);
  revalidatePath("/admin/buddies");
}
