
  import { createRoot } from "react-dom/client";
  import App from "@/src/app/App";
  import "./styles/index.css";

  // Suppress ResizeObserver loop limit exceeded errors which are harmless but annoying
  const suppressErrors = [
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded'
  ];
  
  const handleError = (e: any) => {
    if (suppressErrors.includes(e.message) || (e.reason && suppressErrors.includes(e.reason.message))) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
      return true;
    }
  };

  window.addEventListener('error', handleError, true);
  window.addEventListener('unhandledrejection', handleError, true);

  createRoot(document.getElementById("root")!).render(<App />);
  