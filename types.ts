
export enum AppPhase {
  LAUNCH = 'LAUNCH',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum GameType {
  SOLITAIRE = 'Solitaire',
  BLACKJACK = 'Blackjack',
  POKER = 'Poker',
  TEXAS_HOLDEM = 'Texas Hold \'em',
  RUMMY = 'Rummy'
}

export enum Suit {
  HEARTS = '♥ ',
  DIAMONDS = '♦',
  CLUBS = '♣',
  SPADES = '♠'
}

export enum Rank {
  TWO = '2', THREE = '3', FOUR = '4', FIVE = '5', SIX = '6',
  SEVEN = '7', EIGHT = '8', NINE = '9', TEN = '10',
  JACK = 'J', QUEEN = 'Q', KING = 'K', ACE = 'A'
}

export interface CardData {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number; // Numerical value for game logic
  isFaceUp: boolean;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  hand: CardData[];
  melds: CardData[][]; // Array of melds (each meld is an array of cards)
  chips: number;
  status: 'active' | 'folded' | 'bust' | 'standing' | 'won' | 'lost' | 'waiting';
  currentBet: number;
  lastAction?: string; // e.g. "Hit", "Stand", "Raise"
}

export type HoldEmStage = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

export interface GameState {
  deck: CardData[];
  discardPile: CardData[]; // Specific for Rummy
  players: Player[]; // Index 0 is always the human user
  dealerHand: CardData[];
  pot: number;
  highestBet: number; // For tracking Calls/Raises
  turnIndex: number; // Used to trigger effects when turn updates
  activePlayerId: string | null; // 'p1', 'b1', 'b2', 'dealer'
  gameMessage: string;
  isGameOver: boolean;
  communityCards: CardData[]; // For Hold'em
  holdEmStage: HoldEmStage; // New property
}
