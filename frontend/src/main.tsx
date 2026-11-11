import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Fonts are bundled with the app (no call to Google), so it looks right on a slow or offline connection.
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/caveat/600.css"; // handwriting: report card comments only
import "./index.css";
import { theme } from "./lib/theme";

theme.apply(); // set Paper or Chalkboard before the first paint

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
