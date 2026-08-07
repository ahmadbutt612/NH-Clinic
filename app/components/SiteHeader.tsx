import Link from "next/link";
import { CLINIC, getWhatsAppUrl } from "@/lib/clinic";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " site-header-compact" : ""}`}>
      <div className="site-header-inner">
        <Link className="clinic-brand" href="/" aria-label={`${CLINIC.name} home`}>
          <span className="clinic-logo" aria-hidden="true">
            <span>NH</span>
          </span>
          <span className="clinic-brand-copy">
            <strong>{CLINIC.name}</strong>
            <small>{CLINIC.urduName}</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/#doctors">Doctors</Link>
          <Link href="/#care">Our care</Link>
          <Link href="/#hours">Clinic hours</Link>
          <Link href="/#location">Location</Link>
        </nav>

        <div className="header-actions">
          <a
            className="header-whatsapp"
            href={getWhatsAppUrl("Hello NH Gyne Clinic, I would like some information.")}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <Link className="button button-primary button-small" href="/book">
            Book a visit
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div>
          <Link className="clinic-brand footer-brand" href="/">
            <span className="clinic-logo" aria-hidden="true"><span>NH</span></span>
            <span className="clinic-brand-copy">
              <strong>{CLINIC.name}</strong>
              <small>Thoughtful care in Lahore</small>
            </span>
          </Link>
          <p className="footer-note">
            Specialist women&apos;s health, anesthesia, and pain care in a calm,
            respectful setting.
          </p>
        </div>
        <div className="footer-links">
          <div>
            <span>Visit</span>
            <a href={CLINIC.mapsUrl} target="_blank" rel="noreferrer">
              {CLINIC.address}
            </a>
          </div>
          <div>
            <span>Contact</span>
            <a href={`tel:${CLINIC.phoneE164}`}>{CLINIC.phoneDisplay}</a>
            <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer">WhatsApp us</a>
          </div>
          <div>
            <span>Quick links</span>
            <Link href="/book">Book appointment</Link>
            <Link href="/doctor">Doctor portal</Link>
          </div>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} {CLINIC.name}</span>
        <span>{CLINIC.timezoneLabel}</span>
      </div>
    </footer>
  );
}

export function WhatsAppFloat({ message }: { message?: string }) {
  return (
    <a
      className="whatsapp-float"
      href={getWhatsAppUrl(message ?? "Hello NH Gyne Clinic, I would like to book an appointment.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Contact NH Gyne Clinic on WhatsApp"
    >
      <span className="whatsapp-dot" aria-hidden="true">●</span>
      <span>WhatsApp</span>
    </a>
  );
}
