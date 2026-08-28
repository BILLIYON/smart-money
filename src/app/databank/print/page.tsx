"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function PrintStatementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login?next=/databank/print");
        return;
      }
      const { user } = await meRes.json();
      if (!user) {
        router.push("/login?next=/databank/print");
        return;
      }

      setProfile({ full_name: user.full_name || "Smart Money User", email: user.email || null });

      const contextRes = await fetch("/api/databank/context");
      if (contextRes.ok) {
        const ctxData = await contextRes.json();
        setEntries(ctxData.entries || []);
      }

      setLoading(false);

      // Trigger print after rendering finishes
      setTimeout(() => {
        window.print();
      }, 800);
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-gray-500 font-medium">
        Loading statement details...
      </div>
    );
  }

  // Compute key summary figures
  let totalIncome = 0;
  let totalSpend = 0;
  entries.forEach((e) => {
    const val = Number(e.amount) / 100;
    if (e.entry_type === "income") {
      totalIncome += val;
    } else if (e.entry_type === "expense") {
      totalSpend += Math.abs(val);
    }
  });

  const netWorth = totalIncome - totalSpend;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpend) / totalIncome) * 100 : 0;

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="w-full min-h-screen bg-white text-[#1A1A1A] p-10 leading-normal" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap');
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #E5E7EB;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .logo-area h1 {
          font-family: 'Sora', sans-serif;
          font-size: 20px;
          margin: 0 0 5px 0;
          color: #00C48C;
        }

        .logo-area p {
          margin: 0;
          color: #6B7280;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .statement-meta {
          text-align: right;
        }

        .statement-meta h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 5px 0;
          color: #111827;
        }

        .statement-meta p {
          margin: 2px 0;
          color: #4B5563;
        }

        .user-profile {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
        }

        .user-profile div p {
          margin: 3px 0;
        }

        .user-profile strong {
          color: #111827;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }

        .metric-card {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 15px;
          background: #fff;
        }

        .metric-card .label {
          font-size: 11px;
          color: #6B7280;
          text-transform: uppercase;
          font-weight: 500;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }

        .metric-card .value {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .metric-card .value.negative {
          color: #DC2626;
        }

        .metric-card .value.positive {
          color: #16A34A;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }

        th {
          background: #F3F4F6;
          color: #374151;
          font-weight: 600;
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #E5E7EB;
        }

        td {
          padding: 10px 12px;
          border-bottom: 1px solid #E5E7EB;
          color: #374151;
        }

        tr:last-child td {
          border-bottom: 2px solid #D1D5DB;
        }

        .amount {
          font-weight: 500;
          text-align: right;
        }

        .amount.income {
          color: #16A34A;
        }

        .amount.expense {
          color: #DC2626;
        }

        .footer {
          text-align: center;
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 50px;
          border-top: 1px solid #E5E7EB;
          padding-top: 15px;
        }

        @media print {
          body {
            padding: 0;
            font-size: 12px;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
        
        .no-print-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #111827;
          color: #fff;
          padding: 10px 20px;
          font-weight: 500;
          margin-bottom: 20px;
          border-radius: 6px;
        }
        
        .print-btn {
          background: #00C48C;
          color: white;
          border: none;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .print-btn:hover {
          background: #00B07C;
        }
      ` }} />

      <div className="no-print-bar no-print">
        <span>📄 Statement Preview mode</span>
        <button className="print-btn" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="header">
        <div className="logo-area">
          <h1>Smart Money</h1>
          <p>Your Financial Co-Pilot</p>
        </div>
        <div className="statement-meta">
          <h2>DataBank Statement</h2>
          <p><strong>Period:</strong> All-time</p>
          <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="user-profile">
        <div>
          <p><strong>Account Holder:</strong> {profile?.full_name || "Smart Money User"}</p>
          <p><strong>Email Address:</strong> {profile?.email || "N/A"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p><strong>Status:</strong> Active Connection</p>
          <p><strong>Total Transactions:</strong> {entries.length}</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="label">Total Inflows</div>
          <div className="value positive">{formatNaira(totalIncome)}</div>
        </div>
        <div className="metric-card">
          <div className="label">Total Outflows</div>
          <div className="value negative">-{formatNaira(totalSpend)}</div>
        </div>
        <div className="metric-card">
          <div className="label">Net Cash Position</div>
          <div className="value" style={{ color: netWorth >= 0 ? "#16A34A" : "#DC2626" }}>
            {formatNaira(netWorth)}
          </div>
        </div>
        <div className="metric-card">
          <div className="label">Savings Rate</div>
          <div className="value" style={{ color: savingsRate >= 0 ? "#16A34A" : "#DC2626" }}>
            {savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <h3>Transaction History</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Source</th>
            <th>Category</th>
            <th>Description</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "#6B7280" }}>
                No transactions found in this statement.
              </td>
            </tr>
          ) : (
            entries.map((e) => {
              const amountVal = Number(e.amount) / 100;
              return (
                <tr key={e.id}>
                  <td>{new Date(e.entry_date).toLocaleDateString()}</td>
                  <td style={{ textTransform: "capitalize" }}>{e.source}</td>
                  <td>{e.category || "General"}</td>
                  <td>{e.description || "N/A"}</td>
                  <td className={`amount ${e.entry_type === "income" ? "income" : "expense"}`}>
                    {e.entry_type === "income" ? "+" : "-"}
                    {formatNaira(Math.abs(amountVal))}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="footer">
        <p>This is a computer-generated statement from your Smart Money DataBank integration. All data is processed securely.</p>
        <p>© {new Date().getFullYear()} Smart Money Inc. All rights reserved.</p>
      </div>
    </div>
  );
}
