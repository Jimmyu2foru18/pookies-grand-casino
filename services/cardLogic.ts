import { CardData, Rank, Suit } from '../types';

export const createDeck = (): CardData[] => {
  const suits = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
  const ranks = Object.values(Rank);
  const deck: CardData[] = [];

  suits.forEach(suit => {
    ranks.forEach(rank => {
      let value = 0;
      if (['J', 'Q', 'K'].includes(rank)) value = 10;
      else if (rank === 'A') value = 11; // Default to 11 for Blackjack context, adjustable later
      else value = parseInt(rank);

      deck.push({
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
        value,
        isFaceUp: false
      });
    });
  });

  return deck;
};

export const shuffleDeck = (deck: CardData[]): CardData[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const getCardColor = (suit: Suit): string => {
  return suit === Suit.HEARTS || suit === Suit.DIAMONDS ? 'text-red-600' : 'text-slate-900';
};

// Basic Blackjack Score Calculator
export const calculateBlackjackScore = (hand: CardData[]): number => {
  let score = 0;
  let aces = 0;

  hand.forEach(card => {
    if (card.rank === Rank.ACE) aces += 1;
    score += card.value;
  });

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
};
