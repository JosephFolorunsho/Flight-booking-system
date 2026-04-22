import './globals.css'

export const metadata = {
  title: 'SkyRoute - Flight Booking System',
  description: 'Cloud-Native Flight Booking System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-brand">SkyRoute</h1>
            <div className="nav-links">
              <a href="/">Home</a>
              <a href="/flights">Search Flights</a>
              <a href="/routes">Find Routes</a>
              <a href="/booking">Create Booking</a>
            </div>
          </div>
        </nav>
        <main className="container">
          {children}
        </main>
        <footer className="footer">
          <p>SkyRoute © 2026 </p>
        </footer>
      </body>
    </html>
  )
}