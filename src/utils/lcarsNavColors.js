const LCARS_CHILD_PALETTES = {
  blue: {
    text: "#0a1020",
    tones: ["#8da6ff", "#a0b4ff", "#b3c2ff", "#c6d0ff"],
  },
  gold: {
    text: "#1a1200",
    tones: ["#ffd580", "#ffe099", "#ffebb3", "#fff0c2"],
  },
};

const LCARS_PARENT_PALETTE = {
  text: "#1a1200",
  tones: ["#e8b060", "#f0bc72", "#f5c888", "#fad9a0"],
};

export const LCARS_HOME_PALETTE = {
  text: "#0a1020",
  tones: ["#99aaff", "#8da6ff", "#a8baff", "#b8c6ff"],
};

export const LCARS_DOCS_PALETTE = {
  text: "#1a1200",
  tones: ["#f0c878", "#e8b060", "#f5d090", "#ffe099"],
};

/** Parent items stay gold/tan; children alternate blue then gold by group index. */
export function getLcarsNavPalette(index) {
  const childKey = index % 2 === 0 ? "blue" : "gold";
  return {
    text: LCARS_PARENT_PALETTE.text,
    parent: LCARS_PARENT_PALETTE.tones[0],
    childText: LCARS_CHILD_PALETTES[childKey].text,
    tones: [LCARS_PARENT_PALETTE.tones[0], ...LCARS_CHILD_PALETTES[childKey].tones],
  };
}

export function getLcarsLinkStyle(palette, toneIndex = 0) {
  const isParent = toneIndex === 0;
  const tone = palette.tones[Math.min(toneIndex, palette.tones.length - 1)];
  const text = isParent ? palette.text : palette.childText || palette.text;

  return {
    "--lcars-nav-bg": isParent && palette.parent ? palette.parent : tone,
    "--lcars-nav-text": text,
  };
}
