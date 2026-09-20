import { Nav } from "./components/Nav";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { Value } from "./sections/Value";
import { Gallery } from "./sections/Gallery";
import { HowItWorks } from "./sections/HowItWorks";
import { AgentDesign } from "./sections/AgentDesign";
import { Evals } from "./sections/Evals";
import { TechStack } from "./sections/TechStack";
import { CdfReadiness } from "./sections/CdfReadiness";
import { FieldNotes } from "./sections/FieldNotes";
import { GettingStarted } from "./sections/GettingStarted";
import { Footer } from "./sections/Footer";

export default function App() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Value />
        <Gallery />
        <HowItWorks />
        <AgentDesign />
        <Evals />
        <TechStack />
        <CdfReadiness />
        <FieldNotes />
        <GettingStarted />
      </main>
      <Footer />
    </div>
  );
}
