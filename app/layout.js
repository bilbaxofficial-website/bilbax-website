import Link from "next/link";

export default function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">AUTOINSTA</div>
        
        <nav className="sidebar-nav">
          <Link href="/dashboard" className="sidebar-link active">
            <span className="icon">🏠</span> Dashboard
          </Link>
          <Link href="/dashboard/automations" className="sidebar-link">
            <span className="icon">⚙️</span> Automations
          </Link>
          <Link href="/dashboard/automations/new" className="sidebar-link highlight">
            <span className="icon">➕</span> Create Automation
          </Link>
          <Link href="/dashboard/accounts" className="sidebar-link">
            <span className="icon">📸</span> Instagram Accounts
          </Link>
          <Link href="/dashboard/analytics" className="sidebar-link">
            <span className="icon">📊</span> Analytics
          </Link>
          <Link href="/dashboard/settings" className="sidebar-link">
            <span className="icon">🛠️</span> Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      <style jsx global>{`
        body {
          margin: 0;
          background-color: #fff8ed;
          font-family: var(--font-sans, sans-serif);
          color: #14121f;
        }
      `}</style>

      <style jsx>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background-color: #fff8ed;
        }

        .sidebar {
          width: 260px;
          background-color: #fff8ed;
          border-right: 3px solid #14121f;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sidebar-logo {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #14121f;
          margin-bottom: 36px;
          padding-left: 8px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          color: #14121f;
          text-decoration: none;
          border: 2px solid transparent;
          transition: all 0.1s ease;
        }

        .sidebar-link:hover {
          background-color: #f5eedb;
          border-color: #14121f;
        }

        .sidebar-link.active {
          background-color: #ff4fa3;
          border: 2px solid #14121f;
          box-shadow: 3px 3px 0 #14121f;
          color: #fff8ed;
        }

        .sidebar-link.highlight {
          background-color: #ffd23f;
          border: 2px solid #14121f;
          box-shadow: 3px 3px 0 #14121f;
        }

        .sidebar-link.highlight:hover {
          background-color: #ffc914;
        }

        .main-content {
          flex: 1;
          background-color: #fff8ed;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .app-shell {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 3px solid #14121f;
          }
        }
      `}</style>
    </div>
  );
}
