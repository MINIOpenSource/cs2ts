import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
  type Theme,
} from "@fluentui/react-components";
import App from "./App";
import { loadThemeIsDark, saveThemeIsDark } from "./services/storageService";

const sansDarkTheme: Theme = {
  ...webDarkTheme,
  fontFamilyBase: "sans-serif",
  fontFamilyMonospace: "sans-serif",
  fontFamilyNumeric: "sans-serif",
};

const sansLightTheme: Theme = {
  ...webLightTheme,
  fontFamilyBase: "sans-serif",
  fontFamilyMonospace: "sans-serif",
  fontFamilyNumeric: "sans-serif",
};

function Root() {
  const [isDark, setIsDark] = useState<boolean>(() => loadThemeIsDark(true));

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      saveThemeIsDark(next);
      return next;
    });
  };

  return (
    <FluentProvider theme={isDark ? sansDarkTheme : sansLightTheme}>
      <App isDark={isDark} onToggleTheme={handleToggleTheme} />
    </FluentProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
