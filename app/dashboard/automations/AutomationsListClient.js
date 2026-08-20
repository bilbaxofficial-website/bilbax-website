"use client";

import { createClient } from "../../../lib/supabase-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AutomationsListClient({ automations: initialAutomations, igAccountId, igUsername }) {
  const router = useRouter();
  const supabase = createClient();
  const [automations, setAutomations] = useState(initialAutomations);

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("automations").update({ status: newStatus }).eq("id", id);
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  }

  async function deleteAutomation(id) {
    if (!confirm("Delete this automation? This can't be undone.")) return;
    await supabase.from("automations").delete().eq("id", id);
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  }

  const newAutomationHref = `/dashboard/automations/new?account=${igAccountId}`;

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo">bilbax</a>
        <a href={`/dashboard?account=${igAccountId}`} className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="list-header">
          <div>
            <h1>Your automations</h1>
            {igUsername && <p className="list-subhead">for @{igUsername}</p>}
          </div>
          <a href={newAutomationHref} className="new-btn">+ New</a>
        </div>

        {automations.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">+</div>
            <h2>No automations yet</h2>
            <p>Create your first one to start turning comments into DMs.</p>
            <a href={newAutomationHref} className="empty-btn">Create automation</a>
          </div>
        ) : (
          <div className="automation-list">
            {automations.map((a) => (
              <div key={a.id} className="automation-card">
                <div className="automation-top">
                  <div className="automation-keywords">
                    {a.keywords.includes("*")
                      ? "Any comment"
                      : a.keywords.join(", ")}
                  </div>
                  <span className={`status-pill ${a.status}`}>
                    {a.status === "active" ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="automation-message">"{a.dm_message}"</div>
                <div className="automation-actions">
                  <button
                    className="action-btn"
                    onClick={() => toggleStatus(a.id, a.status)}
                  >
                    {a.status === "active" ? "Pause" : "Activate"}
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => deleteAutomation(a.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          background: #fff8ed;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: #14121f;
        }
        .page-logo {
          font-weight: 800;
          font-size: 20px;
          color: #fff8ed;
          text-decoration: none;
        }
        .back-link {
          color: #fff8ed;
          font-size: 13px;
          text-decoration: none;
          opacity: 0.85;
        }
        .page-main {
          max-width: 640px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .list-header h1 {
          font-size: 24px;
          font-weight: 800;
          color: #14121f;
          margin: 0;
        }
        .list-subhead {
          font-size: 13px;
          color: #8a8496;
          margin: 4px 0 0;
        }
        .new-btn {
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          border: 3px solid #14121f;
          border-radius: 999px;
          padding: 10px 20px;
          font-weight: 800;
          font-size: 14px;
          text-decoration: none;
          box-shadow: 3px 3px 0 #14121f;
        }
        .empty-card {
          text-align: center;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 20px;
          padding: 44px 28px;
          box-shadow: 6px 6px 0 #ffd23f;
        }
        .empty-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 14px;
          border-radius: 999px;
          background: #fff8ed;
          border: 3px solid #14121f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
        }
        .empty-card h2 {
          font-size: 19px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 8px;
        }
        .empty-card p {
          color: #4a4658;
          font-size: 14px;
          margin: 0 0 20px;
        }
        .empty-btn {
          display: inline-block;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          border: 3px solid #14121f;
          border-radius: 999px;
          padding: 12px 24px;
          font-weight: 800;
          font-size: 14px;
          text-decoration: none;
          box-shadow: 3px 3px 0 #14121f;
        }
        .automation-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .automation-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 16px;
          padding: 18px 20px;
          box-shadow: 4px 4px 0 #00d4b8;
        }
        .automation-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .automation-keywords {
          font-weight: 800;
          font-size: 15px;
          color: #14121f;
        }
        .status-pill {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .status-pill.active {
          background: #00d4b8;
          color: #14121f;
        }
        .status-pill.paused {
          background: #eee;
          color: #8a8496;
        }
        .automation-message {
          color: #4a4658;
          font-size: 13px;
          font-style: italic;
          margin-bottom: 14px;
          line-height: 1.4;
        }
        .automation-actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          background: #fff8ed;
          border: 2px solid #14121f;
          border-radius: 8px;
          padding: 6px 14px;
          font-weight: 700;
          font-size: 12px;
          color: #14121f;
          cursor: pointer;
        }
        .action-btn.delete {
          color: #ff4fa3;
        }
      `}</style>
    </div>
  );
}
