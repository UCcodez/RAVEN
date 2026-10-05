import { Routes, Route } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import AnalysesListPage from "./pages/AnalysesListPage";
import AnalysisPage from "./pages/AnalysisPage";
import Layout from "./components/layout/Layout";
import ProgressPage from "./pages/ProgressPage";
import EvidencePage from "./pages/EvidencePage";
import FixCenterPage from "./pages/FixCenterPage";
import BeforeAfterPage from "./pages/BeforeAfterPage";


export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<UploadPage />} />
        <Route path="/analyses" element={<AnalysesListPage />} />
        <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
        <Route path="/analyses/:analysisId/progress" element={<ProgressPage />} />
        <Route path="analyses/:analysisId/evidence" element={<EvidencePage />} />
        <Route path="/analyses/:analysisId/fix-center" element={<FixCenterPage />} />
        <Route path="/analyses/:analysisId/compare" element={<BeforeAfterPage />} />
      </Route>
    </Routes>
  );
}