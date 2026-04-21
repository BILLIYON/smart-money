import { Suspense } from "react";
import { getAdminUsers, ADMIN_PAGE_SIZE } from "@/lib/db";
import { UserSearchInput } from "@/components/admin/UserSearchInput";
import { UsersTable } from "@/components/admin/UsersTable";

export const metadata = { title: "Users · Admin · Smart Money" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const query = searchParams.q ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  const { users, total } = await getAdminUsers(page, query);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
        Users
      </h1>
      <p style={{ fontSize: 14, color: "#6B7A99", marginBottom: 24 }}>
        Manage all registered accounts.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Suspense>
          <UserSearchInput />
        </Suspense>
      </div>

      <UsersTable
        users={users}
        total={total}
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        searchQuery={query}
      />
    </div>
  );
}
