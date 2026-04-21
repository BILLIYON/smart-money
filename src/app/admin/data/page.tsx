import { DangerZoneAction } from "@/components/admin/DangerZoneAction";
import {
  deleteTestUsersAction,
  clearDummyTransactionsAction,
  resetDatabankAction,
} from "./actions";

export const metadata = { title: "Data Management · Admin · Smart Money" };

const ACTIONS = [
  {
    title: "Delete Test Users",
    description:
      "Permanently removes all user accounts whose email contains '+test' or '@example.com', along with all their sessions, goals, chat history, and DataBank entries.",
    confirmPhrase: "DELETE TEST USERS",
    buttonLabel: "Delete Test Users",
    action: deleteTestUsersAction,
  },
  {
    title: "Clear Dummy Transactions",
    description:
      "Deletes all DataBank entries flagged as dummy data (is_dummy = true). This includes synthetic income, expense, and subscription rows added during testing.",
    confirmPhrase: "CLEAR TRANSACTIONS",
    buttonLabel: "Clear Dummy Transactions",
    action: clearDummyTransactionsAction,
  },
  {
    title: "Reset DataBank Fixtures",
    description:
      "Removes all DataBank entries seeded as demo fixtures (is_fixture = true). Use this to restore a clean state before re-seeding from the fixture script.",
    confirmPhrase: "RESET DATABANK",
    buttonLabel: "Reset DataBank Fixtures",
    action: resetDatabankAction,
  },
] as const;

export default function DataManagementPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
        Data Management
      </h1>
      <p style={{ fontSize: 14, color: "#6B7A99", marginBottom: 32 }}>
        Bulk cleanup operations for test and fixture data. All actions are permanent.
      </p>

      {/* Danger zone header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#E53E3E",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "#E53E3E",
          }}
        >
          Danger Zone
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ACTIONS.map(({ title, description, confirmPhrase, buttonLabel, action }) => (
          <div
            key={title}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              borderLeft: "4px solid #E53E3E",
              padding: "24px 28px",
              boxShadow: "0 1px 4px rgba(11,30,61,.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
                {title}
              </div>
              <div style={{ fontSize: 13, color: "#6B7A99", lineHeight: 1.6, maxWidth: 560 }}>
                {description}
              </div>
            </div>
            <DangerZoneAction
              confirmPhrase={confirmPhrase}
              buttonLabel={buttonLabel}
              action={action}
            />
          </div>
        ))}
      </div>

      {/* Informational footer */}
      <div
        style={{
          marginTop: 32,
          padding: "16px 20px",
          borderRadius: 12,
          background: "rgba(245,166,35,.08)",
          border: "1px solid rgba(245,166,35,.25)",
          fontSize: 12,
          color: "#6B7A99",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#F5A623" }}>Note:</strong> Deleting users removes their auth
        account and all associated data via cascade. DataBank cleanups only affect entries
        matching the respective flag — live user data is untouched.
      </div>
    </div>
  );
}
