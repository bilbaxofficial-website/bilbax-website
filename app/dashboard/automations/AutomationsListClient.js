"use client";

import { createClient } from "../../../lib/supabase-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const TRIGGER_LABELS = {
  comment: { icon: "💬", label: "Post/Reel comment" },
  story_reply: { icon: "📖", label: "Story reply" },
  live_comment: { icon: "🔴", label: "Live comment" },
};

export default function AutomationsListClient({ automations: initialAutomations, igAccountId, igUsername, igAccessToken }) {
  const router = useRouter();
  const supabase = createClient();
  const [automations, setAutomations] = useState(initialAutomations);
  const [expandedId, setExpandedId] = useState(null);
  const [postPreviews, setPostPreviews] = useState({}); // post_id -> { thumbnailUrl, caption } | "error" | "loading"

  // Fetch a small thumbnail preview for any automation that's locked to a
  // specific post, so the card shows which post it applies to (not just
  // the generic "Post/Reel comment" trigger type).
  useEffect(() => {
    const postIds = automations
      .filter((a) => a.post_id && !postPreviews[a.post_id])
      .map((a) => a.post_id);
    const uniqueIds = [...new Set(postIds)];
    if (uniqueIds.length === 0 || !igAccessToken) return;

    uniqueIds.forEach((id) => {
      setPostPreviews((prev) => ({ ...prev, [id]: "loading" }));
      fetch(`/api/instagram/media-single?id=${id}&token=${igAccessToken}`)
        .then((res) => res.json())
        .then((data) => {
          setPostPreviews((prev) => ({
            ...prev,
            [id]: data.error ? "error" : data,
          }));
        })
        .catch(() => {
          setPostPreviews((prev) => ({ ...prev, [id]: "error" }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automations, igAccessToken]);

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
        <a href="/" className="page-logo"><img src="/bilbax-logo.png" alt="bilbax" className="brand-logo-img" /></a>
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
            {automations.map((a) => {
              const trigger = TRIGGER_LABELS[a.trigger_type] || TRIGGER_LABELS.comment;
              const isAny = a.keywords?.includes("*");
              const isExpanded = expandedId === a.id;
              const followupCount = Array.isArray(a.followups) ? a.followups.length : 0;
              const preview = a.post_id ? postPreviews[a.post_id] : null;

              return (
                <div key={a.id} className="automation-card">
                  <div className="automation-top">
                    {a.post_id && (
                      <div className="post-preview-thumb">
                        {preview && preview !== "loading" && preview !== "error" && preview.thumbnailUrl ? (
                          <img src={preview.thumbnailUrl} alt="" />
                        ) : preview === "error" ? (
                          <span className="post-preview-fallback">🖼️</span>
                        ) : (
                          <span className="post-preview-fallback">⏳</span>
                        )}
                      </div>
                    )}
                    <div className="automation-title-block">
                      <div className="automation-trigger-row">
                        <span className="trigger-chip">
                          {trigger.icon} {trigger.label}
                        </span>
                        <span className={`status-pill ${a.status}`}>
                          {a.status === "active" ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div className="automation-keywords">
                        {isAny ? "Triggers on any comment" : `Keyword: ${a.keywords?.join(", ")}`}
                      </div>
                      {a.trigger_type === "comment" && (
                        <div className="post-scope-note">
                          {a.post_id ? "🔒 Locked to one post/reel" : "🌐 Applies to all posts"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="automation-message">"{a.dm_message}"</div>

                  {/* Quick glance badges - always visible */}
                  <div className="badge-row">
                    {a.require_follow && <span className="badge badge-follow">🔒 Follow gate</span>}
                    {a.collect_field && (
                      <span className="badge badge-collect">
                        📋 Collects {a.collect_field}
                      </span>
                    )}
                    {a.button_title && <span className="badge badge-button">🔗 {a.button_title}</span>}
                    {followupCount > 0 && (
                      <span className="badge badge-followup">
                        ⏰ {followupCount} follow-up{followupCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {!a.require_follow && !a.collect_field && !a.button_title && followupCount === 0 && (
                      <span className="badge badge-simple">Simple DM, no extras</span>
                    )}
                  </div>

                  <button
                    className="details-toggle"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    {isExpanded ? "Hide details ▲" : "View full details ▼"}
                  </button>

                  {isExpanded && (
                    <div className="details-panel">
                      <div className="detail-row">
                        <span className="detail-label">Trigger type</span>
                        <span className="detail-value">{trigger.icon} {trigger.label}</span>
                      </div>
                      {a.trigger_type === "comment" && (
                        <div className="detail-row">
                          <span className="detail-label">Which post/reel</span>
                          <span className="detail-value">
                            {a.post_id ? (
                              <>
                                Locked to one specific post
                                {preview && preview !== "loading" && preview !== "error" && preview.permalink && (
                                  <>
                                    {" "}
                                    (
                                    <a href={preview.permalink} target="_blank" rel="noreferrer" style={{ color: "#7c3aed" }}>
                                      view on Instagram
                                    </a>
                                    )
                                  </>
                                )}
                              </>
                            ) : (
                              "All posts and reels"
                            )}
                          </span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-label">Matches</span>
                        <span className="detail-value">
                          {isAny ? "Any comment/reply" : a.keywords?.join(", ") || "—"}
                        </span>
                      </div>
                      {a.comment_reply && (
                        <div className="detail-row">
                          <span className="detail-label">Public reply</span>
                          <span className="detail-value">"{a.comment_reply}"</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-label">Follow gate</span>
                        <span className="detail-value">
                          {a.require_follow ? "Required before sending" : "Off"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Data collection</span>
                        <span className="detail-value">
                          {a.collect_field ? `Asks for ${a.collect_field}` : "Off"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Final message</span>
                        <span className="detail-value">"{a.dm_message}"</span>
                      </div>
                      {a.button_title && (
                        <div className="detail-row">
                          <span className="detail-label">Button</span>
                          <span className="detail-value">
                            "{a.button_title}" → {a.button_url}
                          </span>
                        </div>
                      )}
                      {followupCount > 0 && (
                        <div className="detail-row">
                          <span className="detail-label">Follow-ups</span>
                          <span className="detail-value">
                            {a.followups.map((f, i) => (
                              <div key={i} className="followup-detail-item">
                                #{i + 1} after {f.after_minutes >= 60 ? `${Math.round(f.after_minutes / 60)}h` : `${f.after_minutes}m`}: "{f.message}"
                              </div>
                            ))}
                          </span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-label">Created</span>
                        <span className="detail-value">
                          {new Date(a.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  )}

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
              );
            })}
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
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }
        .page-logo img {
          height: 24px;
          width: auto;
          display: block;
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
          margin-bottom: 8px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .post-preview-thumb {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          border: 2px solid #14121f;
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0eee8;
        }
        .post-preview-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .post-preview-fallback {
          font-size: 18px;
        }
        .post-scope-note {
          font-size: 11px;
          color: #8a8496;
          margin-top: 4px;
        }
        .automation-title-block {
          flex: 1;
          min-width: 0;
        }
        .automation-trigger-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .trigger-chip {
          font-size: 11px;
          font-weight: 800;
          color: #7c3aed;
          background: #f5f0ff;
          border: 1.5px solid #7c3aed;
          padding: 3px 10px;
          border-radius: 999px;
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
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1.5px solid #14121f;
        }
        .badge-follow {
          background: #ffd23f;
        }
        .badge-collect {
          background: #00d4b8;
        }
        .badge-button {
          background: #ff4fa3;
          color: #fff;
        }
        .badge-followup {
          background: #7c3aed;
          color: #fff;
        }
        .badge-simple {
          background: #f0eee8;
          color: #8a8496;
          border-color: #d8d4c8;
        }
        .details-toggle {
          background: none;
          border: none;
          color: #7c3aed;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 0;
          margin-bottom: 8px;
        }
        .details-panel {
          background: #fbf7ee;
          border: 2px dashed #14121f;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 14px;
        }
        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(20, 18, 31, 0.08);
          font-size: 13px;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #8a8496;
        }
        .detail-value {
          color: #14121f;
          line-height: 1.5;
          word-break: break-word;
        }
        .followup-detail-item {
          margin-top: 4px;
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
