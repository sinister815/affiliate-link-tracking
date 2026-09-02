import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Dashboard from "@/components/Dashboard";
import JobDetailsPage from "@/pages/JobDetailsPage";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f4f7fa]">
        <Navbar />
        <main className="max-w-5xl mx-auto px-6 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/job/:jobId" element={<JobDetailsPage />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
