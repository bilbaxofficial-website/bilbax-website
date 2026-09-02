"use client";

import { useSearchParams } from "next/navigation";

const VALID_PLANS = new Set(["free", "starter", "growth", "pro"]);

export default function InstagramOnboardingPage() {
  const searchParams = useSearchParams();
  const plan = (searchParams.get("plan") || "free").toLowerCase();
  const selectedPlan = VALID_PLANS.has(plan) ? plan : "free";

  function handleConnectInstagram() {
    window.location.href =
      "/api/instagram/connect?onboarding=1&plan=" +
      encodeURIComponent(selectedPlan);
  }

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="step">STEP 2 OF 2</div>
        <h1>Connect your Instagram</h1>
        <p>
          Connect your Instagram Professional account to finish setting up
          Bilbax.
        </p>

        <div className="plan-box">
          <span>Selected plan</span>
          <strong>{selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</strong>
        </div>

        <button onClick={handleConnectInstagram} className="connect-btn">
          Connect Instagram
        </button>

        <p className="hint">
          You will be redirected securely to Instagram/Meta to authorize the
          connection.
        </p>
      </div>

      <style jsx>{`
        .onboarding-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #14121f;
          padding: 24px;
        }
        .onboarding-card {
          background: #fff8ed;
          border: 3px solid #14121f;
          border-radius: 20px;
          box-shadow: 8px 8px 0 #ff4fa3;
          padding: 40px 32px;
          max-width: 440px;
          width: 100%;
          text-align: center;
        }
        .step {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #ff4fa3;
          margin-bottom: 12px;
        }
        h1 {
          font-size: 30px;
          font-weight: 800;
          margin: 0 0 10px;
          color: #14121f;
        }
        p {
          color: #4a4658;
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.6;
        }
        .plan-box {
          border: 2px solid #14121f;
          border-radius: 12px;
          background: #fff;
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          text-align: left;
        }
        .plan-box span {
          font-size: 13px;
          color: #6b6575;
          font-weight: 700;
        }
        .plan-box strong {
          font-size: 16px;
          color: #14121f;
        }
        .connect-btn {
          width: 100%;
          border: 3px solid #14121f;
          border-radius: 12px;
          padding: 14px 20px;
          background: #ff4fa3;
          color: #14121f;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 4px 4px 0 #14121f;
          transition: transform 0.15s ease;
        }
        .connect-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 #14121f;
        }
        .connect-btn:active {
          transform: translate(0, 0);
          box-shadow: 2px 2px 0 #14121f;
        }
        .hint {
          margin: 20px 0 0;
          font-size: 12px;
          color: #8a8496;
        }
      `}</style>
    </div>
  );
}
