import './globals.css';

export const metadata = {
  title: "Bilbax — Instagram DM Automation",
  description: "Turn Instagram comments into automatic DMs. Capture leads, reply instantly, and grow without code.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
