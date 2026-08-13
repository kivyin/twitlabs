/**
 * Free emoji avatar pack for Fantasies.
 * Emoji are free to use in apps (platform fonts). Funny + flirty tone.
 */
export const FANTASY_AVATARS = [
  // Original set
  { id: "rose", label: "Rose", emoji: "🌹" },
  { id: "fire", label: "Fire", emoji: "🔥" },
  { id: "lips", label: "Kiss", emoji: "💋" },
  { id: "chili", label: "Spicy", emoji: "🌶️" },
  { id: "peach", label: "Peach", emoji: "🍑" },
  { id: "cherries", label: "Cherries", emoji: "🍒" },
  { id: "devil", label: "Devil", emoji: "😈" },
  { id: "hearts", label: "Hearts", emoji: "💕" },
  { id: "smirk", label: "Smirk", emoji: "😏" },
  { id: "sparkles", label: "Sparkle", emoji: "✨" },
  { id: "moon", label: "Night", emoji: "🌙" },
  { id: "diamond", label: "Diamond", emoji: "💎" },

  // Flirty faces
  { id: "wink", label: "Wink", emoji: "😉" },
  { id: "flushed", label: "Flushed", emoji: "😳" },
  { id: "heart_eyes", label: "Heart Eyes", emoji: "😍" },
  { id: "hot_face", label: "Hot", emoji: "🥵" },
  { id: "biting_lip", label: "Bite Lip", emoji: "🫦" },
  { id: "kissy", label: "Blow Kiss", emoji: "😘" },
  { id: "tongue", label: "Tongue", emoji: "😛" },
  { id: "wink_tongue", label: "Winky", emoji: "😜" },
  { id: "drool", label: "Drool", emoji: "🤤" },
  { id: "smug", label: "Smug", emoji: "😌" },
  { id: "angel", label: "Angel", emoji: "😇" },
  { id: "party", label: "Party", emoji: "🥳" },

  // Cheeky symbols
  { id: "eggplant", label: "Eggplant", emoji: "🍆" },
  { id: "banana", label: "Banana", emoji: "🍌" },
  { id: "lollipop", label: "Lollipop", emoji: "🍭" },
  { id: "honey", label: "Honey", emoji: "🍯" },
  { id: "strawberry", label: "Berry", emoji: "🍓" },
  { id: "cocktail", label: "Cocktail", emoji: "🍸" },
  { id: "wine", label: "Wine", emoji: "🍷" },
  { id: "champagne", label: "Cheers", emoji: "🥂" },
  { id: "candy", label: "Candy", emoji: "🍬" },
  { id: "ice_cream", label: "Sundae", emoji: "🍨" },
  { id: "donut", label: "Donut", emoji: "🍩" },
  { id: "cookie", label: "Cookie", emoji: "🍪" },

  // Mood / vibe
  { id: "lightning", label: "Bolt", emoji: "⚡" },
  { id: "star", label: "Star", emoji: "🌟" },
  { id: "comet", label: "Comet", emoji: "☄️" },
  { id: "boom", label: "Boom", emoji: "💥" },
  { id: "dizzy", label: "Dizzy", emoji: "💫" },
  { id: "heartbeat", label: "Pulse", emoji: "💓" },
  { id: "two_hearts", label: "Crush", emoji: "💞" },
  { id: "arrow_heart", label: "Cupid", emoji: "💘" },
  { id: "fire_heart", label: "Hot Heart", emoji: "❤️‍🔥" },
  { id: "black_heart", label: "Dark Heart", emoji: "🖤" },
  { id: "pink_heart", label: "Pink Heart", emoji: "💗" },
  { id: "gift_heart", label: "Gift", emoji: "💝" },

  // Playful props
  { id: "high_heel", label: "Heels", emoji: "👠" },
  { id: "lipstick", label: "Lipstick", emoji: "💄" },
  { id: "nail_polish", label: "Nails", emoji: "💅" },
  { id: "crown", label: "Crown", emoji: "👑" },
  { id: "ring", label: "Ring", emoji: "💍" },
  { id: "key", label: "Key", emoji: "🔑" },
  { id: "lock", label: "Lock", emoji: "🔒" },
  { id: "masks", label: "Masks", emoji: "🎭" },
  { id: "dice", label: "Dice", emoji: "🎲" },
  { id: "teddy", label: "Teddy", emoji: "🧸" },
  { id: "balloon", label: "Balloon", emoji: "🎈" },
  { id: "confetti", label: "Confetti", emoji: "🎉" },
];

export const FANTASY_AVATAR_IDS = FANTASY_AVATARS.map((entry) => entry.id);

export function fantasyAvatarById(id) {
  return FANTASY_AVATARS.find((entry) => entry.id === id) || null;
}
