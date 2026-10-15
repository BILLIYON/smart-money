/**
 * Design token constants for use in Recharts, SVG, and canvas contexts
 * that cannot read CSS custom properties.
 *
 * Keep in sync with :root / [data-theme="dark"] in globals.css.
 */

export const colors = {
  /* Brand (fixed) */
  navy:   "#0B1E3D",
  "navy-2":  "#132952",
  green:  "#00C48C",
  "green-2": "#00A677",
  gold:   "#F5A623",
  muted:  "#6B7A99",

  /* Light mode semantic */
  light: {
    bg:          "#F4F6FB",
    card:        "#ffffff",
    text:        "#0B1E3D",
    muted:       "#6B7A99",
    border:      "#E2E7F0",
    inputBg:     "#F4F6FB",
    sidebarBg:   "#0B1E3D",
    sidebarIcon: "#8A9BBE",
    topbarBg:    "#ffffff",
  },

  /* Dark mode semantic */
  dark: {
    bg:          "#0D1117",
    card:        "#13191F",
    text:        "#E8EFF7",
    muted:       "#8A96A8",
    border:      "rgba(255,255,255,0.08)",
    inputBg:     "#1C2330",
    sidebarBg:   "#080C10",
    sidebarIcon: "#5A6478",
    topbarBg:    "#13191F",
    navy:        "#1C2C4A",
    navy2:       "#243558",
  },
} as const;

export type ColorMode = "light" | "dark";

/** Returns the right semantic palette for the current theme */
export function getSemanticColors(mode: ColorMode) {
  return mode === "dark"
    ? { ...colors.dark, green: colors.green, "green-2": colors["green-2"], gold: colors.gold }
    : { ...colors.light, green: colors.green, "green-2": colors["green-2"], gold: colors.gold, navy: colors.navy, "navy-2": colors["navy-2"] };
}
