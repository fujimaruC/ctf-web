import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "./styles.css";
import App from "./App";
const theme = localStorage.getItem("flagforge.theme") || "system";
document.documentElement.dataset.theme =
  theme === "system"
    ? matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : theme;
const router = createBrowserRouter([{ path: "*", element: <App /> }]);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
// Retire only this application's legacy worker; do not install a new cache layer.
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const r of registrations)
        if (r.active?.scriptURL === `${location.origin}/sw.js`) void r.update();
    })
    .catch(() => {});
