import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "SkyRoute - Flight Booking System",
  description: "Cloud-Native Flight Booking System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar-red">
          <div className="nav-container">
            <h1 className="nav-brand">SkyRoute</h1>
            <div className="nav-links">
              <Link href="/">Home</Link>
              <Link href="/flights">Search Flights</Link>
              <Link href="/routes">Find Routes</Link>
              <Link href="/booking">Create Booking</Link>
            </div>
          </div>
        </nav>
        <main className="container">{children}</main>
        <footer className="footer">
          <p>SkyRoute © 2026 </p>
        </footer>
      </body>
    </html>
  );
}
