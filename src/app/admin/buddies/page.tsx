import { getAllDbBuddies, getHiddenBuddyIds } from "@/lib/db";
import { AdminBuddiesManager } from "@/components/admin/AdminBuddiesManager";

export const metadata = { title: "Buddies · Admin · Smart Money" };
export const dynamic = "force-dynamic";

export default async function AdminBuddiesPage() {
  const [buddies, hiddenIds] = await Promise.all([
    getAllDbBuddies(),
    getHiddenBuddyIds(),
  ]);

  return <AdminBuddiesManager initialBuddies={buddies} initialHiddenIds={hiddenIds} />;
}
