import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { installGlobalErrorLogging } from "./api/logsApi";
import { applyBranding, getStoredBranding } from "./utils/branding";
import { applyTheme, getStoredTheme } from "./utils/theme";
import "./theme.css";
import App from "./App.jsx";

applyTheme(getStoredTheme());
applyBranding(getStoredBranding());
installGlobalErrorLogging();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
