import React from 'react';
import '../styles/about-page.css';

type AboutPageProps = {
  onNavigateHome: () => void;
};

const HOW_IT_WORKS_STEPS: Array<{
  id: number;
  icon: string;
  title: string;
  body: string;
  details: string;
}> = [
  {
    id: 1,
    icon: '📤',
    title: 'Upload your CV',
    body: 'Drop in a PDF, DOCX, or TXT and we instantly read the skills inside.',
    details: 'We extract text securely on the server, then discard the file—nothing is stored.',
  },
  {
    id: 2,
    icon: '🎯',
    title: 'Tune your search',
    body: 'Pick a location and how recent the roles should be to match your goals.',
    details: 'Prefer fresh openings or remote-friendly gigs? Adjust filters to steer the ranking.',
  },
  {
    id: 3,
    icon: '⚙️',
    title: 'Let AI rank for you',
    body: 'We score each job against your profile so the best matches float to the top.',
    details: 'Advanced LLM re-ranking highlights roles that align with your experience and keywords.',
  },
  {
    id: 4,
    icon: '🚀',
    title: 'Apply with confidence',
    body: 'Open the original listing and keep track of saved roles in one place.',
    details: 'Mark jobs as applied, add personal scores, and revisit them anytime from the Saved tab.',
  },
];

const WHY_ITEMS: string[] = [
  'Smarter search: skip endless scrolling and see the relevant roles first.',
  'Privacy first: your CV text is processed temporarily and never stored.',
  'Instant productivity: works out-of-the-box with optional AI boosts.',
  'Stay organised: recent CVs and saved jobs are always within reach.',
];

const NEXT_ITEMS: string[] = [
  'AI-powered re-ranking for even sharper matches.',
  'Editable CV summaries so you control your profile story.',
  'Richer job details including pay ranges, location trends, and remote policies.',
];

export default function AboutPage({ onNavigateHome }: AboutPageProps) {
  const [expandedStep, setExpandedStep] = React.useState<number | null>(null);

  const toggleStep = (id: number) => {
    setExpandedStep(prev => (prev === id ? null : id));
  };

  return (
    <main className="aboutPage">
      <section className="aboutPage__hero">
        <h1 className="aboutPage__title">Know which jobs deserve your energy.</h1>
        <p className="aboutPage__subtitle">
          LLM Job Finder analyses your CV, ranks new openings in seconds, and keeps everything organised so you can apply with confidence.
        </p>
        <button type="button" className="aboutPage__cta" onClick={onNavigateHome}>
          Start finding jobs
        </button>
      </section>

      <section className="aboutPage__section" aria-labelledby="about-how-it-works">
        <div className="aboutPage__sectionHeader">
          <h2 id="about-how-it-works" className="aboutPage__sectionTitle">How it works</h2>
          <p className="aboutPage__sectionLead">Four quick steps from CV upload to your next interview.</p>
        </div>
        <div className="aboutPage__cards">
          {HOW_IT_WORKS_STEPS.map(step => {
            const isExpanded = expandedStep === step.id;
            const detailsId = `about-step-details-${step.id}`;
            return (
              <article key={step.id} className="aboutPage__card">
                <div className="aboutPage__iconWrapper" aria-hidden="true">{step.icon}</div>
                <h3 className="aboutPage__cardTitle">{step.title}</h3>
                <p className="aboutPage__cardBody">{step.body}</p>
                <button
                  type="button"
                  className="aboutPage__detailsButton"
                  onClick={() => toggleStep(step.id)}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                >
                  {isExpanded ? 'Hide details' : 'Learn more'}
                  <span aria-hidden="true">↗</span>
                </button>
                {isExpanded && (
                  <p id={detailsId} className="aboutPage__details">
                    {step.details}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="aboutPage__twoColumn" aria-labelledby="about-why-section about-next-section">
        <div className="aboutPage__listBlock">
          <h2 id="about-why-section" className="aboutPage__listTitle">Why people use it</h2>
          <ul className="aboutPage__list">
            {WHY_ITEMS.map(item => (
              <li key={item} className="aboutPage__listItem">{item}</li>
            ))}
          </ul>
        </div>

        <div className="aboutPage__listBlock">
          <h2 id="about-next-section" className="aboutPage__listTitle">What’s next</h2>
          <ul className="aboutPage__list">
            {NEXT_ITEMS.map(item => (
              <li key={item} className="aboutPage__listItem">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <p className="aboutPage__footerNote">⚡ Find jobs faster. Focus on the ones that matter.</p>
    </main>
  );
}
