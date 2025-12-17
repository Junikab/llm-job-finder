import React from 'react';
// about page styles are split to keep files focused and avoid bleed
import '../styles/about/hero.css';
import '../styles/about/steps.css';
import '../styles/about/lists.css';

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
    icon: '📍',
    title: 'Upload CV & choose location',
    body: 'Drop a PDF, DOCX, or TXT and pick where to search (or choose Any).',
    details: 'We read your CV on the server to extract skills, then discard the file. Location guides which listings we fetch.',
  },
  {
    id: 2,
    icon: '🤖',
    title: 'AI ranks your matches',
    body: 'We compare jobs to your profile so the best ones rise to the top.',
    details: 'The model scores each listing against your skills and titles to explain why it fits.',
  },
  {
    id: 3,
    icon: '✅',
    title: 'Apply and stay organised',
    body: 'Open listings, save favourites, and mark applied — all in one place.',
    details: 'Your saved/applied status is easy to manage so you can follow up later.',
  },
];

const WHY_ITEMS: string[] = [
  'See relevant roles first — skip endless scrolling.',
  'Privacy first — your CV text is processed briefly and not stored.',
  'Works out of the box — optional AI extras when you want them.',
  'Stay organised — save jobs and track what you’ve applied to.',
];

const NEXT_ITEMS: string[] = [
  'Sharper matching and explanations.',
  'Editable profile summaries.',
  'Richer job details and insights.',
];

export default function AboutPage({ onNavigateHome }: AboutPageProps) {

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

      <section className="aboutPage__section aboutPage__section--steps" aria-labelledby="about-how-it-works">
        <div className="aboutPage__sectionHeader">
          <h2 id="about-how-it-works" className="aboutPage__sectionTitle">How it works</h2>
          <p className="aboutPage__sectionLead">Three quick steps from CV upload to your next interview.</p>
        </div>
        <ol className="aboutPage__steps" role="list">
          {HOW_IT_WORKS_STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <li className="aboutPage__step">
                <div className="aboutPage__stepNumber" aria-hidden="true">{step.id}</div>
                <h3 className="aboutPage__stepTitle">{step.title}</h3>
                <p className="aboutPage__stepBody">{step.body}</p>
              </li>
              {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                <li className="aboutPage__connector" aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </ol>
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
