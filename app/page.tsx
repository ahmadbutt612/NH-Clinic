import { DOCTORS, WEEKLY_HOURS } from "@/lib/clinic";
import { SiteFooter, SiteHeader, WhatsAppFloat } from "./components/SiteHeader";

const careAreas = [
  {
    number: "01",
    title: "Women’s wellness",
    description:
      "Private, unhurried consultations for routine gynecology, menstrual health, and wellbeing through every life stage.",
  },
  {
    number: "02",
    title: "Pregnancy support",
    description:
      "Reassuring prenatal and postnatal guidance, with careful attention to both mother and baby.",
  },
  {
    number: "03",
    title: "Pain care",
    description:
      "Thoughtful assessment and evidence-based treatment for acute, chronic, and procedure-related pain.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="site-main">
        <section className="clinic-hero" aria-labelledby="hero-title">
          <div className="hero-bloom hero-bloom-one" aria-hidden="true" />
          <div className="hero-bloom hero-bloom-two" aria-hidden="true" />
          <div className="hero-copy-wrap">
            <p className="eyebrow hero-enter hero-enter-one">
              Specialist care · Township, Lahore
            </p>
            <h1 id="hero-title" className="hero-enter hero-enter-two">
              Care that listens.
              <em> Expertise you can trust.</em>
            </h1>
            <p className="hero-intro hero-enter hero-enter-three">
              Personal, respectful care for women&apos;s health, pregnancy, anesthesia,
              and pain—designed around your comfort and your time.
            </p>
            <div className="hero-actions hero-enter hero-enter-four">
              <a className="button button-primary" href="/book">Book an appointment</a>
              <a className="button button-quiet" href="#doctors">Meet our doctors</a>
            </div>
            <div className="hero-trust hero-enter hero-enter-five">
              <div><strong>30 min</strong><span>Dedicated appointments</span></div>
              <div><strong>2</strong><span>Experienced specialists</span></div>
              <div><strong>6 days</strong><span>Evening clinic each week</span></div>
            </div>
          </div>

          <aside className="hero-appointment-card hero-enter hero-enter-three" aria-label="How booking works">
            <div className="hero-card-top">
              <span className="live-dot" aria-hidden="true" />
              Live availability
            </div>
            <h2>Find a time that feels easy.</h2>
            <ol className="booking-mini-steps">
              <li><span>1</span><div><strong>Choose your doctor</strong><small>Match the care you need</small></div></li>
              <li><span>2</span><div><strong>Pick an open slot</strong><small>Only available times appear</small></div></li>
              <li><span>3</span><div><strong>Instant confirmation</strong><small>No waiting for approval</small></div></li>
            </ol>
            <a href="/book" className="hero-card-link">
              View available appointments <span aria-hidden="true">→</span>
            </a>
            <p>All appointment times are shown in Pakistan Standard Time.</p>
          </aside>
        </section>

        <section className="intro-strip" aria-label="Our promise">
          <span>Private consultations</span>
          <i aria-hidden="true" />
          <span>Respectful care</span>
          <i aria-hidden="true" />
          <span>Clear guidance</span>
          <i aria-hidden="true" />
          <span>Easy online booking</span>
        </section>

        <section className="section doctors-section reveal" id="doctors" aria-labelledby="doctors-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Our doctors</p>
              <h2 id="doctors-title">Expertise, with a human touch.</h2>
            </div>
            <p>
              Your consultation is a calm, confidential space to ask questions,
              understand your options, and feel genuinely heard.
            </p>
          </div>

          <div className="doctor-grid">
            {DOCTORS.map((doctor, index) => (
              <article className={`doctor-card doctor-card-${doctor.tone}`} key={doctor.id}>
                <div className="doctor-card-portrait" aria-hidden="true">
                  <span>{doctor.initials}</span>
                  <i className="portrait-ring-one" />
                  <i className="portrait-ring-two" />
                </div>
                <div className="doctor-card-copy">
                  <span className="doctor-index">0{index + 1} · {doctor.shortTitle}</span>
                  <h3>{doctor.name}</h3>
                  <p className="doctor-title">{doctor.title}</p>
                  <p className="doctor-credentials">{doctor.credentials}</p>
                  <p className="doctor-bio">{doctor.bio}</p>
                  <ul className="doctor-services" aria-label={`${doctor.name} services`}>
                    {doctor.services.map((service) => <li key={service}>{service}</li>)}
                  </ul>
                  <a className="text-link" href={`/book?doctor=${doctor.slug}`}>
                    Book with {doctor.name} <span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="care-section" id="care" aria-labelledby="care-title">
          <div className="care-intro reveal">
            <p className="eyebrow eyebrow-light">Care, thoughtfully delivered</p>
            <h2 id="care-title">Clinical expertise should still feel personal.</h2>
            <p>
              We pair specialist knowledge with the time, privacy, and clarity you
              need to make confident decisions about your health.
            </p>
          </div>
          <div className="care-list reveal">
            {careAreas.map((area) => (
              <article key={area.number}>
                <span>{area.number}</span>
                <div><h3>{area.title}</h3><p>{area.description}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="section visit-section reveal" id="hours" aria-labelledby="visit-title">
          <div className="visit-copy">
            <p className="eyebrow">Plan your visit</p>
            <h2 id="visit-title">Evening appointments that fit your day.</h2>
            <p>
              Choose any open 30-minute appointment online. Bookings are confirmed
              instantly, and cancelled times become available again automatically.
            </p>
            <a className="button button-primary" href="/book">See available times</a>
          </div>
          <div className="hours-card">
            <div className="hours-card-heading">
              <div><span>Clinic hours</span><strong>Evening clinic</strong></div>
              <span className="hours-zone">PKT</span>
            </div>
            <dl>
              {WEEKLY_HOURS.map((item) => (
                <div key={item.day} className={item.hours === "Closed" ? "closed-day" : ""}>
                  <dt>{item.day}</dt><dd>{item.hours}</dd>
                </div>
              ))}
            </dl>
            <p>Doctor holidays are removed from online availability.</p>
          </div>
        </section>

        <section className="location-section" id="location" aria-labelledby="location-title">
          <div className="location-art" aria-hidden="true">
            <div className="map-road map-road-one" />
            <div className="map-road map-road-two" />
            <div className="map-road map-road-three" />
            <div className="map-pin"><span>NH</span></div>
          </div>
          <div className="location-copy reveal">
            <p className="eyebrow">Township, Lahore</p>
            <h2 id="location-title">Close by. Easy to find.</h2>
            <p>138-2, Block 2, Sector B2, Township, Lahore 54770</p>
            <div className="location-actions">
              <a className="button button-primary" href="https://www.google.com/maps/search/?api=1&query=NH%20Gyne%20Clinic%20138-2%20Block%202%20Sector%20B2%20Township%20Lahore" target="_blank" rel="noreferrer">Open in Google Maps</a>
              <a className="button button-quiet" href="tel:+923444406456">Call 0344 4406456</a>
            </div>
          </div>
        </section>

        <section className="final-cta reveal">
          <div className="cta-flower" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow eyebrow-light">Your health deserves time</p>
          <h2>Ready when you are.</h2>
          <p>Choose your doctor and reserve an available appointment in a few simple steps.</p>
          <a className="button button-cream" href="/book">Book your appointment</a>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
