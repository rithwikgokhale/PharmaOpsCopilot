import { Nav } from "./components/Nav";
import { Footer } from "./sections/Footer";
import { LandingPage } from "./pages/LandingPage";
import { DocsIndex } from "./pages/DocsIndex";
import { DocPage } from "./pages/DocPage";
import { Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsIndex />} />
          <Route path="/docs/:slug" element={<DocPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
