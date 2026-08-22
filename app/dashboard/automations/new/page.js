"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-client";

export default function CreateAutomationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [triggerType, setTriggerType] = useState("story_mention");
  const [messageContent, setMessageContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    if (!messageContent.trim()) {
      setErrorMsg("Please write a message content!");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    // Get current user and their connected instagram account
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: igAcc } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!igAcc) {
      setErrorMsg("Please connect an Instagram account first!");
      setLoading(false);
      return;
    }

    // Insert automation into database
    const { error } = await supabase.from("automations").insert({
      user_id: user.id,
      instagram_account_id: igAcc.id,
      trigger_type: triggerType,
      message: messageContent.trim(),
      is_active: true,
    });

    setLoading(false);

    if (error) {
      setErrorMsg("Error saving automation: " + error.message);
    } else {
      // Success! Redirect back to dashboard
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="dash-container">
      {/* Top Header */}
      <header className="dash-header">
        <div>
          <h1 className="page-title">CREATE AUTOMATION</h1>
          <h2 className="page-subtitle">Set up a new rule</h2>
        </div>
        
        <Link href="/dashboard" className="brutal-btn back-btn">
          ← Back
        </Link>
      </header>

      {/* Main Form Card */}
      <form onSubmit={handleSave} className="brutal-card">
        {errorMsg && <div className="error-box">{errorMsg}</div>}

        <div className="form-group">
          <label className="brutal-label">Select Trigger</label>
          <p className="help-text">When should this message be sent?</p>
          <select 
            className="brutal-input" 
            value={triggerType} 
            onChange={(e) => setTriggerType(e.target.value)}
          >
            <option value="story_mention">When someone mentions me in a Story</option>
            <option value="new_follower">When I get a new Follower</option>
            <option value="specific_word">When someone DMs a specific word</option>
          </select>
        </div>

        <div className="form-group">
          <label className="brutal-label">Your Message</label>
          <p className="help-text">What do you want the bot to say?</p>
          <textarea
            className="brutal-input textarea"
            rows="4"
            placeholder="Hey! Thanks for the mention! 🎉"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
          ></textarea>
        </div>

        <div className="form-actions">
          <button type="submit" className="brutal-btn primary" disabled={loading}>
            {loading ? "Saving..." : "Save Automation"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .dash-container {
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 800;
          margin: 0;
          color: #14121f;
          text-transform: uppercase;
        }
        
        .page-subtitle {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: #14121f;
        }

        .brutal-card {
          background-color: #fff;
          border: 3px solid #14121f;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 6px 6px 0 #14121f;
          max-width: 800px;
        }

        .error-box {
          background-color: #ff4fa3;
          color: #fff;
          border: 2px solid #14121f;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .brutal-label {
          display: block;
          font-weight: 800;
          font-size: 18px;
          margin-bottom: 4px;
          color: #14121f;
        }

        .help-text {
          font-size: 14px;
          font-weight: 600;
          color: #555;
          margin-top: 0;
          margin-bottom: 12px;
        }

        .brutal-input {
          width: 100%;
          border: 3px solid #14121f;
          border-radius: 8px;
          padding: 14px;
          font-family: inherit;
          font-weight: 600;
          font-size: 16px;
          background: #fff8ed;
          box-sizing: border-box;
          color: #14121f;
        }

        .brutal-input:focus {
          outline: none;
          background: #fff;
          border-color: #ff4fa3;
        }

        .textarea {
          resize: vertical;
        }

        .form-actions {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }

        .brutal-btn {
          padding: 12px 24px;
          border: 3px solid #14121f;
          border-radius: 8px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          color: #14121f;
          transition: transform 0.1s;
          box-shadow: 4px 4px 0 #14121f;
        }

        .brutal-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 #14121f;
        }

        .brutal-btn.back-btn {
          background-color: #e6e2d3;
        }

        .brutal-btn.primary {
          background-color: #ffd23f;
        }
      `}</style>
    </div>
  );
}
