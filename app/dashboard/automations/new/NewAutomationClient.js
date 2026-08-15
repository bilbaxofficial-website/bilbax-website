"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-client";

export default function NewAutomationClient({ igAccountId, igUsername }) {
  const router = useRouter();
  const supabase = createClient();

  const [triggerType, setTriggerType] = useState("keyword"); // "keyword" or "any"
  const [keywords, setKeywords] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [commentReply, setCommentReply] = useState("Sent you a DM! 📩");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (triggerType === "keyword" && !keywords.trim()) {
      setError("Add at least one keyword, or switch to 'Any comment'.");
      return;
    }
    if (!dmMessage.trim()) {
      setError("Write the DM message that gets sent.");
      return;
    }

    setSaving(true);

    const keywordArray =
      triggerType === "any"
        ? ["*"] // "*" means match any comment
        : keywords.split(",").map((k) => k.trim()).filter(Boolean);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("automations").insert({
      user_id: user.id,
      ig_account_id: igAccountId,
      post_id: null, // null = applies to all posts for now
      keywords: keywordArray,
      dm_message: dmMessage,
      comment_reply: commentReply || null,
      status: "active",
    });

    setSaving(false);

    if (insertError) {
      setError("Couldn't save this automation. Try again.");
      return;
    }

    router.push("/dashboard/automations");
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo">bilbax</a>
        <a href="/dashboard" className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="form-card">
          <div className="form-badge">New automation</div>
          <h1>Turn comments into DMs</h1>
          <p className="form-sub">for @{igUsername}</p>

          {error && <div className="form-error">{error}</div>}

          <div className="field-group">
            <label className="field-label">When someone comments...</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${triggerType === "keyword" ? "active" : ""}`}
                onClick={() => setTriggerType("keyword")}
              >
                A specific word
              </button>
              <button
                type="button"
                className={`toggle-btn ${triggerType === "any" ? "active" : ""}`}
                onClick={() => setTriggerType("any")}
              >
                Anything at all
              </button>
            </div>
          </div>

          {triggerType === "keyword" && (
            <div className="field-group">
              <label className="field-label">Trigger keywords</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. PRICE, LINK, INFO"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <div className="field-hint">Separate multiple keywords with commas. Not case-sensitive.</div>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">DM message to send</label>
            <textarea
              className="field-textarea"
              placeholder="Hey {first_name}! Here's the link you asked for: ..."
              value={dmMessage}
              onChange={(e) => setDmMessage(e.target.value)}
              rows={4}
            />
            <div className="field-hint">Use {"{first_name}"} to personalize with the commenter's name.</div>
          </div>

          <div className="field-group">
            <label className="field-label">Public comment reply (optional)</label>
            <input
              type="text"
              className="field-input"
              placeholder="Sent you a DM! 📩"
              value={commentReply}
              onChange={(e) => setCommentReply(e.target.value)}
            />
            <div className="field-hint">Shown publicly under their comment. Leave blank to skip.</div>
          </div>

          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save automation"}
          </button>
        </div>
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
          max-width: 560px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        .form-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 24px;
          padding: 36px 28px;
          box-shadow: 8px 8px 0 #7c3aed;
        }
        .form-badge {
          display: inline-block;
          background: #ffd23f;
          border: 2px solid #14121f;
          color: #14121f;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: 16px;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 4px;
        }
        .form-sub {
          color: #8a8496;
          font-size: 14px;
          margin: 0 0 24px;
        }
        .form-error {
          background: #fff0f0;
          border: 2px solid #ff4fa3;
          color: #14121f;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .field-group {
          margin-bottom: 22px;
        }
        .field-label {
          display: block;
          font-weight: 700;
          font-size: 13px;
          color: #14121f;
          margin-bottom: 8px;
        }
        .toggle-row {
          display: flex;
          gap: 8px;
        }
        .toggle-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid #14121f;
          border-radius: 10px;
          background: #fff8ed;
          font-weight: 700;
          font-size: 13px;
          color: #14121f;
          cursor: pointer;
        }
        .toggle-btn.active {
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
        }
        .field-input,
        .field-textarea {
          width: 100%;
          border: 2px solid #14121f;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          font-family: inherit;
          color: #14121f;
          background: #fff8ed;
          box-sizing: border-box;
        }
        .field-textarea {
          resize: vertical;
        }
        .field-hint {
          font-size: 12px;
          color: #8a8496;
          margin-top: 6px;
        }
        .save-btn {
          width: 100%;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          border: 3px solid #14121f;
          border-radius: 999px;
          padding: 16px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 4px 4px 0 #14121f;
          margin-top: 8px;
        }
        .save-btn:hover:not(:disabled) {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 #14121f;
        }
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
