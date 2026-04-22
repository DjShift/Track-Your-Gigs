import "./globals.css";

export const metadata = {
  title: "DJ Gigs Manager",
  description: "Manage DJ gigs, income, travel costs and calendar sync.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Mobile background */}
        <div
          className="fixed inset-0 pointer-events-none md:hidden"
          style={{
            zIndex: 0,
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.48)), url('/images/dj-background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "72% top",
            backgroundRepeat: "no-repeat",
            opacity: 0.9,
          }}
        />

        {/* Desktop / tablet background */}
        <div
          className="fixed inset-0 pointer-events-none hidden md:block"
          style={{
            zIndex: 0,
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.48)), url('/images/dj-background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
            opacity: 0.9,
          }}
        />

        {/* Dark overlay */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            background:
              "radial-gradient(circle at top center, rgba(0,0,0,0.02), rgba(0,0,0,0.28) 60%, rgba(0,0,0,0.72) 100%)",
          }}
        />

        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}