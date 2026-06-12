import { useEffect, useState } from "react";

// sessionStorage intentional — tokens are cleared when the tab closes,
// which is preferable for a banking context over the persistent localStorage.
export function useOAuthToken() {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("token=")) {
      const tokenMatch = hash.match(/token=([^&]+)/);
      if (tokenMatch && tokenMatch[1]) {
        const token = decodeURIComponent(tokenMatch[1]);
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("access_token", token);

        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.scope) {
            sessionStorage.setItem("user_type", payload.scope);
          }
        } catch (e) {
          console.error("Error parsing token:", e);
        }

        window.dispatchEvent(new Event("authChange"));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    setIsProcessing(false);
  }, []);

  return isProcessing;
}
