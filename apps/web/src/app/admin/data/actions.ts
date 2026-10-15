"use server";

import { revalidatePath } from "next/cache";
import { deleteTestUsers, clearDummyTransactions, resetDatabank } from "@/lib/db";

export async function deleteTestUsersAction(): Promise<{ count: number }> {
  const count = await deleteTestUsers();
  revalidatePath("/admin/data");
  revalidatePath("/admin/overview");
  return { count };
}

export async function clearDummyTransactionsAction(): Promise<{ count: number }> {
  const count = await clearDummyTransactions();
  revalidatePath("/admin/data");
  return { count };
}

export async function resetDatabankAction(): Promise<{ count: number }> {
  const count = await resetDatabank();
  revalidatePath("/admin/data");
  return { count };
}
