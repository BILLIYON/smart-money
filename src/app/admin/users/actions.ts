"use server";

import { revalidatePath } from "next/cache";
import { deleteUser, bulkDeleteUsers } from "@/lib/db";

export async function deleteUserAction(userId: string): Promise<void> {
  await deleteUser(userId);
  revalidatePath("/admin/users");
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<void> {
  await bulkDeleteUsers(userIds);
  revalidatePath("/admin/users");
}
