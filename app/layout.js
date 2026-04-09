import "./globals.css";

export const metadata = {
  title: "DJ Gigs Manager",
  description: "Simple local app for tracking DJ gigs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}