import { useCallback, useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("raven-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
      }
    } catch {}
    return "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { 
      localStorage.setItem("raven-theme", theme); 
    } catch {}
  }, [theme]);

  const set = useCallback((t) => setTheme(t === "dark" ? "dark" : "light"), []);
  
  return [theme, set];
}
