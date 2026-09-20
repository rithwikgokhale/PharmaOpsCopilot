import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Hero } from "../sections/Hero";
import { Problem } from "../sections/Problem";
import { Value } from "../sections/Value";
import { Gallery } from "../sections/Gallery";
import { HowItWorks } from "../sections/HowItWorks";
import { AgentDesign } from "../sections/AgentDesign";
import { Evals } from "../sections/Evals";
import { TechStack } from "../sections/TechStack";
import { Engineering } from "../sections/Engineering";
import { CdfReadiness } from "../sections/CdfReadiness";
import { FieldNotes } from "../sections/FieldNotes";
import { GettingStarted } from "../sections/GettingStarted";

export function LandingPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = location.hash.replace(/^#/, "");
    const scroll = () => document.getElementById(id)?.scrollIntoView({ block: "start" });
    scroll();
    // Gallery images and other above-the-fold content can shift layout after first paint.
    const timers = [50, 200, 500].map((ms) => window.setTimeout(scroll, ms));
    return () => timers.forEach(clearTimeout);
  }, [location.hash, location.key]);

  return (
    <>
      <Hero />
      <Problem />
      <Value />
      <Gallery />
      <HowItWorks />
      <AgentDesign />
      <Evals />
      <TechStack />
      <Engineering />
      <CdfReadiness />
      <FieldNotes />
      <GettingStarted />
    </>
  );
}
