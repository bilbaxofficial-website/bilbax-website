"use client";

import Link from "next/link";
import { useState } from "react";

export default function CreateAutomationPage() {
  const [trigger, setTrigger] = useState("story_mention");
  const [message, setMessage] = useState("");

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
      <div className="brutal-card">
        <div className="form-group">
          <label className="brutal-label">Select Trigger</label>
          <p className="help-text">When should this message be sent?</p>
          <select 
            className="brutal-input" 
            value={trigger} 
            onChange={(e) => setTrigger(e.target.value)}
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div>

        <div className="form-actions">
          <button className="brutal-btn primary">
            Save Automation
          </button>
        </div>
      </div>

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
