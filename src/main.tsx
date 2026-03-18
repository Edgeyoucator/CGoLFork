import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";

import AppPublic from "./app/AppPublic";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppPublic />
  </StrictMode>,
);
