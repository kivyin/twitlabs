/** Distinct LCARS section families — parent + children share a hue; children shift slightly. */
const LCARS_SECTION_PALETTES = [
  {
    text: "#1a1000",
    parent: "#ff9933",
    children: ["#ffa64d", "#ffb366", "#ffc080"],
  },
  {
    text: "#1a1200",
    parent: "#e8b060",
    children: ["#efba72", "#f5c484", "#face96"],
  },
  {
    text: "#0a1020",
    parent: "#8da6ff",
    children: ["#9bb2ff", "#a9beff", "#b7caff"],
  },
  {
    text: "#0a1020",
    parent: "#b0b8ff",
    children: ["#bcc3ff", "#c8ceff", "#d4d9ff"],
  },
  {
    text: "#041510",
    parent: "#66ccaa",
    children: ["#78d4b6", "#8adcc2", "#9ce4ce"],
  },
  {
    text: "#1a0810",
    parent: "#cc6699",
    children: ["#d478a8", "#dc8ab7", "#e49cc6"],
  },
  {
    text: "#1a1000",
    parent: "#ffcc99",
    children: ["#ffd4a8", "#ffdcb8", "#ffe4c8"],
  },
  {
    text: "#1a0808",
    parent: "#ff5555",
    children: ["#ff6e6e", "#ff8787", "#ffa0a0"],
  },
];

export const LCARS_HOME_PALETTE = {
  text: "#0a1020",
  parent: "#8da6ff",
  children: ["#9bb2ff", "#a9beff", "#b7caff"],
};

export const LCARS_DOCS_PALETTE = {
  text: "#1a1200",
  parent: "#e8b060",
  children: ["#efba72", "#f5c484", "#face96"],
};

/** One palette per nav section so parent + children read as a unit. */
export function getLcarsNavPalette(index) {
  const section = LCARS_SECTION_PALETTES[index % LCARS_SECTION_PALETTES.length];
  return {
    text: section.text,
    parent: section.parent,
    children: section.children,
    tones: [section.parent, ...section.children],
  };
}

export function getLcarsLinkStyle(palette, toneIndex = 0) {
  const tones = palette.tones ?? [
    palette.parent,
    ...(palette.children ?? []),
  ];
  const tone = tones[Math.min(toneIndex, tones.length - 1)] ?? palette.parent;

  return {
    "--lcars-nav-bg": tone,
    "--lcars-nav-text": palette.text,
  };
}

export function getLcarsGroupStyle(palette) {
  if (!palette?.parent) return undefined;
  return {
    "--lcars-section-accent": palette.parent,
    "--lcars-nav-text": palette.text,
  };
}
