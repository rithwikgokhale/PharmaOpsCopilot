import { Section } from "../components/Section";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

const BASE = import.meta.env.BASE_URL;

const SHOTS = [
  {
    src: `${BASE}screenshots/dashboard-overview-light.png`,
    alt: "Dashboard overview in light mode showing Batch B-104",
    caption: "Dashboard (light) — deviation summary, KPIs, timeline, time series, and copilot panel.",
  },
  {
    src: `${BASE}screenshots/dashboard-overview-dark.png`,
    alt: "Dashboard overview in dark mode showing Batch B-104",
    caption: "Dashboard (dark) — same B-104 view with dark theme.",
  },
  {
    src: `${BASE}screenshots/copilot-why-delayed.png`,
    alt: "Copilot structured answer for why batch was delayed",
    caption: "Copilot — evidence-grounded answer with contributing factors and citation chips.",
  },
  {
    src: `${BASE}screenshots/copilot-release-declined.png`,
    alt: "Copilot declining a batch release decision",
    caption: "Guardrails — release/safety questions are declined and routed to human QA.",
  },
  {
    src: `${BASE}screenshots/timeseries-anomaly.png`,
    alt: "Time series charts with anomaly shading",
    caption: "Time series — pH and temperature with anomaly windows and spec bands.",
  },
  {
    src: `${BASE}screenshots/combined-signals.png`,
    alt: "Combined multi-signal chart",
    caption: "Combined signals — normalized overlay with brush zoom.",
  },
  {
    src: `${BASE}screenshots/data-quality-panel.png`,
    alt: "Data quality panel with warning flags",
    caption: "Data quality — calibration, sensor reliability, and QA disposition flags.",
  },
  {
    src: `${BASE}screenshots/evals-passing.png`,
    alt: "Eval suite showing 12 of 12 passing",
    caption: "Evals — 12/12 deterministic cases verifying guardrails and citations.",
  },
  {
    src: `${BASE}screenshots/cdf-ready-architecture.png`,
    alt: "CDF-ready architecture and mapping",
    caption: "CDF-ready — local → CDF mapping and today vs. future architecture.",
  },
];

export function Gallery() {
  return (
    <Section
      id="gallery"
      title="Screenshots"
      subtitle="Live captures from the local dashboard and copilot demo (Batch B-104)."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {SHOTS.map((s) => (
          <ScreenshotFrame key={s.src} {...s} />
        ))}
      </div>
    </Section>
  );
}
