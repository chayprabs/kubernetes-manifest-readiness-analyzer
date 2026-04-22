const themeScript = `
  (function () {
    try {
      var key = "authos-theme";
      var root = document.documentElement;
      var stored = window.localStorage.getItem(key);
      var theme =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "system";
      var resolved =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme;

      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
    } catch (error) {
      document.documentElement.classList.add("light");
    }
  })();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
