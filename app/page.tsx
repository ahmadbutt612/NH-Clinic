const features = [
  {
    title: "App Router",
    description: "A clean app directory with layouts, pages, and metadata ready to extend.",
  },
  {
    title: "TypeScript",
    description: "Strong defaults for building components and application logic with confidence.",
  },
  {
    title: "Tailwind CSS",
    description: "Utility-first styling is configured, with a simple global design foundation.",
  },
];

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Next Starter home">
          <span className="brand-mark">N</span>
          Next Starter
        </a>
        <a className="nav-link" href="https://nextjs.org/docs">
          Documentation <span aria-hidden="true">↗</span>
        </a>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow">Ready to build</div>
        <h1>A clean starting point for your next idea.</h1>
        <p className="hero-copy">
          This project includes the essentials, sensible defaults, and just enough
          structure to start shipping without getting in your way.
        </p>
        <div className="actions">
          <a className="button button-primary" href="#foundation">
            Explore the setup
          </a>
          <a className="button button-secondary" href="https://nextjs.org/learn">
            Learn Next.js
          </a>
        </div>
      </section>

      <section className="foundation" id="foundation" aria-labelledby="foundation-title">
        <div className="section-heading">
          <span>Foundation</span>
          <h2 id="foundation-title">Everything you need to begin.</h2>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-number">0{index + 1}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <p>Built with Next.js and React.</p>
        <p>Start by editing <code>app/page.tsx</code></p>
      </footer>
    </main>
  );
}
