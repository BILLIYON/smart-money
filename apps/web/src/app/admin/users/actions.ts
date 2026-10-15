"use server";

import { revalidatePath } from "next/cache";
import { deleteUser, bulkDeleteUsers, changeUserPassword, toggleAdminRole } from "@/lib/db";

export async function deleteUserAction(userId: string): Promise<void> {
  await deleteUser(userId);
  revalidatePath("/admin/users");
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<void> {
  await bulkDeleteUsers(userIds);
  revalidatePath("/admin/users");
}

export async function changePasswordAction(userId: string, password: string): Promise<void> {
  await changeUserPassword(userId, password);
}

export async function toggleAdminRoleAction(userId: string, isAdmin: boolean): Promise<void> {
  await toggleAdminRole(userId, isAdmin);
  revalidatePath("/admin/users");
}
