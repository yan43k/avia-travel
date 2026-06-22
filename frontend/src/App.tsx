import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toaster } from "react-hot-toast";
import { HelmetProvider } from "react-helmet-async";
import HomePage from "./pages/HomePage";
import CalculatorPage from "./pages/CalculatorPage";
import TrackPage from "./pages/TrackPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CabinetPage from "./pages/CabinetPage";
import AdminPage from "./pages/AdminPage";
import { Protected } from "./components/Protected";

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/track" element={<TrackPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/cabinet"
                element={
                  <Protected>
                    <CabinetPage />
                  </Protected>
                }
              />
              <Route
                path="/admin"
                element={
                  <Protected admin>
                    <AdminPage />
                  </Protected>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="bottom-right" />
        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}
