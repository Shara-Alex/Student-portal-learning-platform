/**
 * Paper (light) or Chalkboard (dark). The choice is remembered in this browser.
 * tokens.css switches every colour when <html data-theme="chalkboard"> is set.
 */
export type Theme = "paper" | "chalkboard";
const KEY = "theme";

function saved(): Theme {
  try {
    return localStorage.getItem(KEY) === "chalkboard" ? "chalkboard" : "paper";
  } catch {
    return "paper"; // storage can be blocked (private browsing); fall back to the default
  }
}

export const theme = {
  get: saved,
  apply(value: Theme = saved()) {
    document.documentElement.dataset.theme = value;
  },
  set(value: Theme) {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* not saved, but still applied for this visit */
    }
    theme.apply(value);
  },
};
