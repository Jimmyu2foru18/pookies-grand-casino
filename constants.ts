import { GameType, Rank } from './types';

// Hardcoded PNG references as requested
export const BACKGROUNDS = {
  LAUNCH: 'launch_bg.png',
  MENU: 'menu_bg.png',
  GAME_OVER: 'game_over_bg.png',
  
  // Specific Game Tables
  [GameType.SOLITAIRE]: 'solitairetableimg.png',
  [GameType.BLACKJACK]: 'blackjacktableimg.png',
  [GameType.POKER]: 'pokertableimg.png',
  [GameType.TEXAS_HOLDEM]: 'texasholdemtableimg.png',
  [GameType.RUMMY]: 'rummytableimg.png',
};

// Winning Screens
export const WIN_BACKGROUNDS = {
  [GameType.SOLITAIRE]: 'solitaire_win.png',
  [GameType.BLACKJACK]: 'blackjack_win.png',
  [GameType.POKER]: 'poker_win.png',
  [GameType.TEXAS_HOLDEM]: 'texasholdem_win.png',
  [GameType.RUMMY]: 'rummy_win.png',
};

export const INITIAL_CHIPS = 2000;
export const MIN_BET = 10;
export const MAX_BET = 500;
export const SOLITAIRE_COST = 52; // Standard Vegas Buy-in
export const SOLITAIRE_REWARD = 5; // Standard Vegas Reward per card
export const RUMMY_REWARD = 500; // Reward for winning Rummy (since no betting)

// Card Assets
export const CARD_BACK_IMAGE = 'card_back_bg.png';
// Helper to get card face image name: e.g. "card_face_K.png"
export const getCardFaceImage = (rank: Rank) => `card_face_${rank}.png`;

// Player Profile Image (Pookie)
export const POOKIE_AVATAR = "pookie.png";

export const DEALER_AVATAR = "sachi.png";

export const BOT_AVATARS: Record<string, string> = {
  "Pondy": "pondy.png",
  "Mythic": "mythic.png",
  "Weaponized":"Weaponized.png",
  "Calamari": "calamari.png",
  "Th3vious": "th3vious.png",
  "Arjay": "arjay.png",
  "Tireaz": "tireaz.png",
  "Dotti": "dotti.png",
  "Falky": "falky.png",
  "Iamcat21": "iamcat21.png",
  "Sofis": "sofis.png",
  "LustyCow": "lustycow.png",
  "Maral": "maral.png",
  "Sinari": "sinari.png",
};

export const GAME_RULES: Record<GameType, string> = {
  [GameType.SOLITAIRE]: `
    Klondike Solitaire (Vegas Style):
    - Buy-In: $${SOLITAIRE_COST}.
    - Earn $${SOLITAIRE_REWARD} for every card moved to the Foundation.
    - Double Click cards to auto-move them to the Foundation.
    - Win by moving all 52 cards to the top right foundations.
  `,
  [GameType.BLACKJACK]: `
    Blackjack Rules:
    - Beat Sachi's (Dealer) hand without going over 21.
    - Face cards are 10. Aces are 1 or 11.
    - Sachi must hit on soft 17.
    - Blackjack pays 3:2.
  `,
  [GameType.POKER]: `
    5-Card Draw Poker Rules:
    - Ante up to start.
    - 5 cards dealt. Select cards to HOLD, then Draw.
    - Best hand wins the pot.
  `,
  [GameType.TEXAS_HOLDEM]: `
    Texas Hold 'em Rules:
    - 2 hole cards. 5 community cards.
    - Betting rounds: Pre-flop, Flop, Turn, River.
    - Best 5-card hand wins.
  `,
  [GameType.RUMMY]: `
    Gin Rummy Rules:
    - Form sets & runs.
    - Draw and Discard each turn.
    - Knock when deadwood is low.
  `
};

export const DISCLAIMER_TEXT = `
  WARNING: GAMBLING SIMULATION

  This application is a simulation intended for entertainment purposes only. 
  No real money is involved, wagered, or won. 
  
  However, simulating gambling mechanics can be addictive. 
  If you or someone you know has a gambling problem, please seek help.
  
  By proceeding, you acknowledge that this is a "Play for Fun" experience 
  and agree to our Terms of Service.
  Be a good Pookie!
  A good pookie gifts subs. 

 @Th3viousGameus @SachiMizora  
`;