import React, { useState, useEffect, useRef } from 'react';
import { GameType, Player, CardData, GameState, Suit, Rank, HoldEmStage } from '../types';
import { createDeck, shuffleDeck, calculateBlackjackScore } from '../services/cardLogic';
import { MIN_BET, MAX_BET, SOLITAIRE_COST, SOLITAIRE_REWARD, RUMMY_REWARD, BACKGROUNDS, WIN_BACKGROUNDS, DEALER_AVATAR, BOT_AVATARS } from '../constants';
import Card from './Card';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  DragStartEvent, 
  DragEndEvent, 
  useDroppable,
  pointerWithin
} from '@dnd-kit/core';
import { User, Cpu, CircleDollarSign, Coins, ArrowUpCircle, Shield, XOctagon, Repeat, Trophy, Clock, ChevronsUp, HandMetal, RefreshCw, Layers, Trash2 } from 'lucide-react';

interface GameBoardProps {
  gameType: GameType;
  initialChips: number;
  onGameOver: (finalChips: number) => void;
  onClose: (finalChips: number) => void;
}

type RoundPhase = 'BETTING' | 'DEALING' | 'SWAPPING' | 'PLAYING' | 'RESOLVING' | 'ROUND_OVER' | 'VICTORY' | 'RUMMY_DRAW' | 'RUMMY_TURN' | 'DEALING_COMMUNITY';

// --- DROP ZONE COMPONENT ---
const DropZone: React.FC<{ id: string, children?: React.ReactNode, className?: string }> = ({ id, children, className }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-pookie-pink bg-white/5' : ''} transition-all`}>
      {children}
    </div>
  );
};

const GameBoard: React.FC<GameBoardProps> = ({ gameType, initialChips, onGameOver, onClose }) => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    discardPile: [],
    players: [{
      id: 'p1', 
      name: 'Pookie (You)', 
      isBot: false, 
      hand: [],
      melds: [], 
      chips: initialChips, 
      status: 'active', 
      currentBet: 0
    }],
    dealerHand: [],
    pot: 0,
    highestBet: 0,
    turnIndex: 0,
    activePlayerId: null,
    gameMessage: 'Welcome to Pookie\'s Grand Casino.',
    isGameOver: false,
    communityCards: [],
    holdEmStage: 'PREFLOP'
  });

  // Betting & Phases
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('BETTING');
  const [betAmount, setBetAmount] = useState<number>(MIN_BET);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  
  // Selection State (Swap/Meld/Discard)
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  
  // Rummy Specific
  const [rummyHasDrawn, setRummyHasDrawn] = useState<boolean>(false);

  // Solitaire Specific
  const [solitaireState, setSolitaireState] = useState<{
    tableau: CardData[][];
    foundations: CardData[][];
    stock: CardData[];
    waste: CardData[];
  }>({ tableau: [], foundations: [[],[],[],[]], stock: [], waste: [] });
  
  const [activeDragCard, setActiveDragCard] = useState<CardData | null>(null);
  const [activeDragStack, setActiveDragStack] = useState<CardData[]>([]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize Players
  useEffect(() => {
    setGameState(prev => {
        const currentChips = prev.players[0]?.chips ?? initialChips;
        const human: Player = {
            id: 'p1', name: 'Pookie (You)', isBot: false, hand: [], melds: [], chips: currentChips, status: 'active', currentBet: 0
        };
		// Player Names 
        const botNames = [
          "Pondy", "Weaponized", "Mythic", "Calamari", "Th3vious", "Arjay", 
          "Tireaz", "Dotti", "Falky", "Iamcat21", "Sofis", "LustyCow", "Maral", "Sinari"
        ];
        
        const allBots = botNames.map((name, idx) => ({
             id: `b${idx}`, name, isBot: true, chips: Math.floor(Math.random() * 4000) + 1000
        }));

        // Select 3 or 4 bots
        const numBots = Math.random() > 0.5 ? 4 : 3;
        const tableBots = allBots.sort(() => 0.5 - Math.random()).slice(0, numBots).map(b => ({
          ...b,
          hand: [],
          melds: [],
          status: 'active' as const,
          currentBet: 0
        }));

        const players = gameType === GameType.SOLITAIRE ? [human] : [human, ...tableBots];
        
        return {
            ...prev,
            players,
            activePlayerId: null,
            gameMessage: `Welcome to the Grand Table. Playing ${gameType}.`
        };
    });
    
    // Set default bet amount based on game type
    if (gameType === GameType.SOLITAIRE) {
       setBetAmount(SOLITAIRE_COST);
    } else if (gameType === GameType.RUMMY) {
       setBetAmount(0); // No betting for Rummy
    } else {
       setBetAmount(100);
    }
    setRoundPhase('BETTING'); // Reset phase on game switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType]); 
  
  // Auto-start Rummy: Wait for players to be populated (length > 1) before starting
  useEffect(() => {
    if (gameType === GameType.RUMMY && roundPhase === 'BETTING' && gameState.players.length > 1) {
       handlePlaceBet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, roundPhase, gameState.players.length]);

  // --- TURN SYSTEM ENGINE ---
  useEffect(() => {
    if (gameState.isGameOver || (roundPhase !== 'PLAYING' && roundPhase !== 'RUMMY_DRAW' && roundPhase !== 'RUMMY_TURN')) return;
    
    const activeId = gameState.activePlayerId;
    if (!activeId) return;

    if (activeId === 'p1') {
        if (gameType !== GameType.RUMMY) {
           const toCall = gameState.highestBet - gameState.players[0].currentBet;
           const msg = toCall > 0 ? `Call $${toCall} or Fold?` : "Your Turn.";
           setGameState(prev => ({...prev, gameMessage: msg}));
        }
        return;
    }

    // Bot Turn
    const timer = setTimeout(() => {
        if (activeId === 'dealer') {
            processDealerTurn();
        } else {
            if (gameType === GameType.RUMMY) {
                processRummyBotTurn(activeId);
            } else {
                processBotTurn(activeId);
            }
        }
    }, 1500); 

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activePlayerId, gameState.turnIndex, roundPhase]);

  // --- HOLD'EM DEAL ANIMATION EFFECT ---
  useEffect(() => {
    if (roundPhase === 'DEALING_COMMUNITY') {
      const dealTimer = setTimeout(() => {
        setGameState(prev => {
           const deck = [...prev.deck];
           let community = [...prev.communityCards];
           let nextStage: HoldEmStage = prev.holdEmStage;
           let msg = "";

           if (prev.holdEmStage === 'PREFLOP') {
               for (let i = 0; i < 3; i++) {
                   const c = deck.pop();
                   if (c) { c.isFaceUp = true; community.push(c); }
               }
               nextStage = 'FLOP';
               msg = "THE FLOP";
           } else if (prev.holdEmStage === 'FLOP') {
               const c = deck.pop();
               if (c) { c.isFaceUp = true; community.push(c); }
               nextStage = 'TURN';
               msg = "THE TURN";
           } else if (prev.holdEmStage === 'TURN') {
               const c = deck.pop();
               if (c) { c.isFaceUp = true; community.push(c); }
               nextStage = 'RIVER';
               msg = "THE RIVER";
           }

           const newPlayers = prev.players.map(p => ({
               ...p,
               currentBet: 0,
               lastAction: undefined
           }));

           // Determine who starts next round (first active player after dealer/button)
           // Simplified: First non-folded player
           const firstActive = newPlayers.find(p => p.status !== 'folded')?.id || null;

           return {
               ...prev,
               deck,
               communityCards: community,
               holdEmStage: nextStage,
               players: newPlayers,
               highestBet: 0,
               gameMessage: msg,
               activePlayerId: firstActive
           };
        });
        setRoundPhase('PLAYING');
      }, 1500); // 1.5 second delay for "Dealing..."

      return () => clearTimeout(dealTimer);
    }
  }, [roundPhase]);


  // --- HELPER FUNCTIONS ---
  const getRankValue = (rank: Rank): number => {
    const order = [Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING];
    return order.indexOf(rank) + 1;
  };

  const isOppositeColor = (c1: CardData, c2: CardData) => {
    const isRed1 = c1.suit === Suit.HEARTS || c1.suit === Suit.DIAMONDS;
    const isRed2 = c2.suit === Suit.HEARTS || c2.suit === Suit.DIAMONDS;
    return isRed1 !== isRed2;
  };

  // --- BOT INTELLIGENCE ---
  const processBotTurn = (botId: string) => {
    setGameState(prev => {
        const players = [...prev.players];
        const botIndex = players.findIndex(p => p.id === botId);
        if (botIndex === -1) return prev; 
        
        const bot = { ...players[botIndex] };
        const deck = [...prev.deck];
        let potToAdd = 0;
        let nextHighestBet = prev.highestBet;

        // BLACKJACK
        if (gameType === GameType.BLACKJACK) {
            const score = calculateBlackjackScore(bot.hand);
            if (score < 17) {
                const card = deck.pop();
                if (card) {
                    card.isFaceUp = true;
                    bot.hand = [...bot.hand, card];
                    bot.lastAction = "HIT";
                    if (calculateBlackjackScore(bot.hand) > 21) {
                        bot.status = 'bust';
                        bot.lastAction = "BUST";
                    }
                }
            } else {
                bot.status = 'standing';
                bot.lastAction = "STAND";
            }
        } 
        // POKER & TEXAS HOLD'EM
        else if (gameType === GameType.POKER || gameType === GameType.TEXAS_HOLDEM) {
             const currentTableBet = prev.highestBet;
             const botCurrentBet = bot.currentBet;
             const toCall = currentTableBet - botCurrentBet;
             const actionRoll = Math.random();

             if (toCall > 0) {
                 if (actionRoll > 0.8 && bot.chips >= toCall + 50) {
                     const raiseAmount = toCall + 50;
                     bot.chips -= raiseAmount;
                     bot.currentBet += raiseAmount;
                     potToAdd += raiseAmount;
                     nextHighestBet = bot.currentBet;
                     bot.lastAction = "RAISE";
                 } else if ((actionRoll > 0.2 || gameType === GameType.TEXAS_HOLDEM) && bot.chips >= toCall) {
                     bot.chips -= toCall;
                     bot.currentBet += toCall;
                     potToAdd += toCall;
                     bot.lastAction = "CALL";
                 } else {
                     bot.status = 'folded';
                     bot.lastAction = "FOLD";
                 }
             } else {
                 if (actionRoll > 0.9 && bot.chips >= 50) {
                     const raiseAmt = 50;
                     bot.chips -= raiseAmt;
                     bot.currentBet += raiseAmt;
                     potToAdd += raiseAmt;
                     nextHighestBet = bot.currentBet;
                     bot.lastAction = "RAISE";
                 } else {
                     bot.lastAction = "CHECK";
                 }
             }
        }

        players[botIndex] = bot;
        
        let nextActiveId = '';
        if (gameType === GameType.BLACKJACK) {
             if (bot.status === 'bust' || bot.status === 'standing') {
                nextActiveId = getNextPlayerId(botId, players);
            } else {
                nextActiveId = botId; 
            }
        } else {
            nextActiveId = getNextPlayerId(botId, players);
        }
        
        const newState = {
            ...prev,
            players,
            deck,
            pot: prev.pot + potToAdd,
            highestBet: nextHighestBet,
            activePlayerId: nextActiveId,
            turnIndex: prev.turnIndex + 1
        };

        return checkBettingRoundComplete(newState);
    });
  };

  const processRummyBotTurn = (botId: string) => {
    setGameState(prev => {
       const players = [...prev.players];
       const idx = players.findIndex(p => p.id === botId);
       const bot = { ...players[idx] };
       const deck = [...prev.deck];
       const discardPile = [...prev.discardPile];

       let drawnCard: CardData | undefined;
       if (deck.length > 0) {
          drawnCard = deck.pop();
       } else if (discardPile.length > 0) {
          drawnCard = discardPile.shift();
       }

       if (drawnCard) {
          drawnCard.isFaceUp = true;
          bot.hand = [...bot.hand, drawnCard];
       }

       const rankCounts: Record<string, CardData[]> = {};
       bot.hand.forEach(c => {
         if (!rankCounts[c.rank]) rankCounts[c.rank] = [];
         rankCounts[c.rank].push(c);
       });

       Object.values(rankCounts).forEach(group => {
          if (group.length >= 3) {
             bot.melds.push(group);
             const idsToRemove = new Set(group.map(g => g.id));
             bot.hand = bot.hand.filter(c => !idsToRemove.has(c.id));
          }
       });

       if (bot.hand.length > 0) {
           const discardIdx = Math.floor(Math.random() * bot.hand.length);
           const discarded = bot.hand.splice(discardIdx, 1)[0];
           discardPile.push(discarded);
           bot.lastAction = "Played Turn";
       } else {
           bot.status = 'won';
       }

       players[idx] = bot;

       if (bot.hand.length === 0) {
           setTimeout(() => performResolution(players, [], []), 500);
           return { ...prev, players, deck, discardPile, isGameOver: true };
       }

       return {
           ...prev,
           players,
           deck,
           discardPile,
           activePlayerId: getNextPlayerId(botId, players),
           turnIndex: prev.turnIndex + 1
       };
    });
  };

  const processDealerTurn = () => {
      setGameState(prev => {
          if (gameType !== GameType.BLACKJACK) {
             setTimeout(() => performResolution(prev.players, prev.dealerHand, prev.deck), 1000);
             return { ...prev, activePlayerId: null, gameMessage: "Showdown!" };
          }

          if (prev.dealerHand.length < 2) {
             return { ...prev, activePlayerId: null, gameMessage: "Error: Sachi's Hand Empty" };
          }

          let dealerHand = [...prev.dealerHand];
          let deck = [...prev.deck];
          let done = false;

          if (!dealerHand[1].isFaceUp) {
              dealerHand[1].isFaceUp = true;
          } else {
              const score = calculateBlackjackScore(dealerHand);
              if (score < 17) {
                  const card = deck.pop();
                  if (card) {
                      card.isFaceUp = true;
                      dealerHand.push(card);
                  }
              } else {
                  done = true;
              }
          }

          if (done) {
              setTimeout(() => performResolution(prev.players, dealerHand, deck), 1000);
              return { ...prev, dealerHand, activePlayerId: null, gameMessage: "Sachi Finished." };
          } else {
              return { ...prev, dealerHand, deck, turnIndex: prev.turnIndex + 1, gameMessage: "Sachi Thinking..." };
          }
      });
  };

  const getNextPlayerId = (currentId: string, currentPlayers: Player[]): string => {
      const idx = currentPlayers.findIndex(p => p.id === currentId);
      
      if (gameType === GameType.RUMMY || gameType === GameType.TEXAS_HOLDEM || gameType === GameType.POKER) {
          // Circular Turn
          let nextIdx = (idx + 1) % currentPlayers.length;
          let loops = 0;
          while (currentPlayers[nextIdx].status === 'folded' && loops < currentPlayers.length) {
              nextIdx = (nextIdx + 1) % currentPlayers.length;
              loops++;
          }
          if (loops === currentPlayers.length) return 'dealer';
          return currentPlayers[nextIdx].id;
      }

      // Linear Turn for Blackjack
      let nextIdx = idx + 1;
      while (nextIdx < currentPlayers.length) {
          if (currentPlayers[nextIdx].status !== 'folded') {
              return currentPlayers[nextIdx].id;
          }
          nextIdx++;
      }
      return 'dealer';
  };

  const checkBettingRoundComplete = (state: GameState): GameState => {
      if (gameType !== GameType.TEXAS_HOLDEM && gameType !== GameType.POKER) return state;

      const activePlayers = state.players.filter(p => p.status !== 'folded');
      const allMatched = activePlayers.every(p => p.currentBet === state.highestBet);
      
      if (allMatched && state.activePlayerId === state.players.find(p => p.status !== 'folded')?.id) {
          if (gameType === GameType.TEXAS_HOLDEM) {
              if (state.holdEmStage === 'RIVER') {
                  setTimeout(() => performResolution(state.players, [], state.deck), 1000); 
                  return { ...state, activePlayerId: null, gameMessage: "Showdown!" };
              } else {
                  // Transition to dealing phase to show animation/delay
                  setRoundPhase('DEALING_COMMUNITY');
                  return { ...state, activePlayerId: null, gameMessage: `Dealer is dealing...` };
              }
          } else {
              return { ...state, activePlayerId: 'dealer' }; 
          }
      }
      
      return state;
  };

  // --- PLAYER ACTIONS ---

  const handlePlaceBet = () => {
    // For Rummy, betAmount is 0, so this check passes if player has chips > 0, or logic needs adjustment.
    // If chips are 0, we might want to let them play Rummy if it's free? 
    // But Game Over logic relies on chips > 0. Let's assume standard logic: need > 0 even if bet is 0 (or allow exact 0 if free?)
    // Actually, if betAmount is 0, condition chips < 0 is false (unless chips negative).
    if (!gameState.players[0] || (betAmount > 0 && gameState.players[0].chips < betAmount)) {
      setGameState(prev => ({...prev, gameMessage: "Insufficient funds for Pookie!"}));
      return;
    }
    
    // Move phase immediately to prevent double-trigger in useEffect
    setRoundPhase('DEALING');

    // Safely update players without mutation
    const newPlayers = gameState.players.map((p, index) => {
        if (index === 0) {
             return { ...p, chips: p.chips - betAmount, currentBet: betAmount, lastAction: "BET" };
        }
        if (gameType === GameType.RUMMY) {
             return { ...p, chips: p.chips - betAmount };
        } else if (gameType !== GameType.SOLITAIRE) {
             return { ...p, chips: p.chips - betAmount, currentBet: betAmount, lastAction: "BET" };
        }
        return p;
    });

    const pot = betAmount * (gameType === GameType.SOLITAIRE ? 0 : newPlayers.length);

    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      pot,
      gameMessage: "Dealing cards...",
      activePlayerId: null
    }));
    
    startRoundLogic(newPlayers);
  };

  const startRoundLogic = (currentPlayers: Player[]) => {
    setTimeout(() => {
        const deck = shuffleDeck(createDeck());
        let dealerHand: CardData[] = [];
        let discardPile: CardData[] = [];
        let communityCards: CardData[] = [];

        if (gameType === GameType.SOLITAIRE) {
            setupSolitaire(deck);
            setRoundPhase('PLAYING');
            return;
        }

        if (gameType === GameType.RUMMY) {
             currentPlayers.forEach(p => {
                p.hand = [];
                for(let i=0; i<7; i++) p.hand.push({ ...deck.pop()!, isFaceUp: p.id === 'p1' }); 
             });
             const discard = deck.pop();
             if (discard) {
                 discard.isFaceUp = true;
                 discardPile.push(discard);
             }
             setRoundPhase('RUMMY_DRAW');
             setRummyHasDrawn(false);
        } else if (gameType === GameType.BLACKJACK) {
            currentPlayers.forEach(p => {
                p.hand = [
                    { ...deck.pop()!, isFaceUp: true },
                    { ...deck.pop()!, isFaceUp: true }
                ];
                p.status = 'active';
            });
            dealerHand = [
                { ...deck.pop()!, isFaceUp: true },
                { ...deck.pop()!, isFaceUp: false }
            ];
            setRoundPhase('PLAYING');
        } else if (gameType === GameType.TEXAS_HOLDEM) {
            currentPlayers.forEach(p => {
                p.hand = [];
                for(let i=0; i<2; i++) p.hand.push({ ...deck.pop()!, isFaceUp: p.id === 'p1' });
                p.status = 'active';
                p.currentBet = p.currentBet; 
            });
            setRoundPhase('PLAYING');
        } else {
            currentPlayers.forEach(p => {
                p.hand = [];
                for(let i=0; i<5; i++) p.hand.push({ ...deck.pop()!, isFaceUp: p.id === 'p1' });
                p.status = 'active';
            });
            setRoundPhase('PLAYING');
        }

        const canSwap = [GameType.POKER].includes(gameType); 
        
        setGameState(prev => ({
            ...prev,
            deck,
            discardPile,
            players: currentPlayers,
            dealerHand,
            communityCards,
            turnIndex: 0,
            activePlayerId: canSwap ? null : 'p1', 
            gameMessage: canSwap ? "Select cards to exchange." : "Pookie's Turn.",
            isGameOver: false,
            holdEmStage: 'PREFLOP'
        }));
        
        if (canSwap) {
          setRoundPhase('SWAPPING');
          setSelectedCardIds(new Set());
        }

    }, 1000);
  };

  // --- ACTIONS ---

  const handleFold = () => {
    setGameState(prev => {
        const newPlayers = [...prev.players];
        newPlayers[0] = { ...newPlayers[0], status: 'folded', lastAction: "FOLD" };
        
        return checkBettingRoundComplete({ 
            ...prev, 
            players: newPlayers, 
            activePlayerId: getNextPlayerId('p1', newPlayers),
            turnIndex: prev.turnIndex + 1 
        });
    });
  };

  const handleCheck = () => {
      const toCall = gameState.highestBet - gameState.players[0].currentBet;
      if (toCall > 0) {
          setGameState(prev => ({...prev, gameMessage: `Cannot Check. Must Call $${toCall}.`}));
          return;
      }
      setGameState(prev => {
          const newPlayers = [...prev.players];
          newPlayers[0] = { ...newPlayers[0], lastAction: "CHECK" };
          
          return checkBettingRoundComplete({
              ...prev,
              players: newPlayers,
              activePlayerId: getNextPlayerId('p1', newPlayers),
              turnIndex: prev.turnIndex + 1
          });
      });
  };

  const handleCall = () => {
      const toCall = gameState.highestBet - gameState.players[0].currentBet;
      if (gameState.players[0].chips < toCall) {
          setGameState(prev => ({...prev, gameMessage: "Not enough chips."}));
          return;
      }
      setGameState(prev => {
          const newPlayers = [...prev.players];
          newPlayers[0] = { 
              ...newPlayers[0], 
              chips: newPlayers[0].chips - toCall,
              currentBet: newPlayers[0].currentBet + toCall,
              lastAction: "CALL"
          };
          
          return checkBettingRoundComplete({
              ...prev,
              players: newPlayers,
              pot: prev.pot + toCall,
              activePlayerId: getNextPlayerId('p1', newPlayers),
              turnIndex: prev.turnIndex + 1
          });
      });
  };

  const handleRaise = () => {
      const toCall = gameState.highestBet - gameState.players[0].currentBet;
      const raiseAmt = 50; 
      const totalCost = toCall + raiseAmt;

      if (gameState.players[0].chips < totalCost) {
           setGameState(prev => ({...prev, gameMessage: "Not enough chips to Raise."}));
           return;
      }

      setGameState(prev => {
          const newPlayers = [...prev.players];
          const newCurrentBet = newPlayers[0].currentBet + totalCost;
          newPlayers[0] = {
              ...newPlayers[0],
              chips: newPlayers[0].chips - totalCost,
              currentBet: newCurrentBet,
              lastAction: "RAISE"
          };
          
          return checkBettingRoundComplete({
              ...prev,
              players: newPlayers,
              pot: prev.pot + totalCost,
              highestBet: newCurrentBet,
              activePlayerId: getNextPlayerId('p1', newPlayers),
              turnIndex: prev.turnIndex + 1
          });
      });
  };

  const handleHit = () => {
    setGameState(prev => {
        const newDeck = [...prev.deck];
        const card = newDeck.pop();
        if (!card) return prev;
        card.isFaceUp = true;
        
        // Safely copy and update player to prevent double-updates in Strict Mode
        const newPlayers = [...prev.players];
        newPlayers[0] = { 
            ...newPlayers[0], 
            hand: [...newPlayers[0].hand, card],
            lastAction: "HIT"
        };
        
        let nextActive = 'p1';
        if (calculateBlackjackScore(newPlayers[0].hand) > 21) {
            newPlayers[0] = { 
                ...newPlayers[0], 
                status: 'bust',
                lastAction: "BUST"
            };
            nextActive = getNextPlayerId('p1', newPlayers);
        }
        return { ...prev, deck: newDeck, players: newPlayers, activePlayerId: nextActive, turnIndex: prev.turnIndex + 1 };
    });
  };

  const handleStand = () => {
    setGameState(prev => {
        const newPlayers = [...prev.players];
        newPlayers[0] = { 
            ...newPlayers[0], 
            status: 'standing',
            lastAction: "STAND"
        };
        return { ...prev, players: newPlayers, activePlayerId: getNextPlayerId('p1', newPlayers), turnIndex: prev.turnIndex + 1 };
    });
  };

  const handleRummyDraw = (source: 'STOCK' | 'DISCARD') => {
      if (roundPhase !== 'RUMMY_DRAW') return;
      setGameState(prev => {
          const newDeck = [...prev.deck];
          const newDiscard = [...prev.discardPile];
          let card: CardData | undefined;
          if (source === 'STOCK') card = newDeck.pop();
          else card = newDiscard.pop();
          if (!card) return prev;
          card.isFaceUp = true;
          
          const newPlayers = [...prev.players];
          newPlayers[0] = { 
              ...newPlayers[0], 
              hand: [...newPlayers[0].hand, card] 
          };
          
          return { ...prev, deck: newDeck, discardPile: newDiscard, players: newPlayers, gameMessage: "Meld sets/runs or Discard." };
      });
      setRoundPhase('RUMMY_TURN');
      setRummyHasDrawn(true);
  };

  const handleRummyMeld = () => {
      const selectedIds = Array.from(selectedCardIds);
      if (selectedIds.length < 3) { setGameState(prev => ({...prev, gameMessage: "Invalid Meld: Need 3+ cards."})); return; }
      
      setGameState(prev => {
          const hand = prev.players[0].hand;
          const meldCards = hand.filter(c => selectedCardIds.has(c.id));
          
          // Check for SET (Same Rank)
          const ranks = meldCards.map(c => c.rank);
          const isSet = ranks.every(r => r === ranks[0]);
          
          // Check for RUN (Same Suit, Consecutive Ranks)
          let isRun = false;
          if (!isSet) {
              const suit = meldCards[0].suit;
              const sameSuit = meldCards.every(c => c.suit === suit);
              if (sameSuit) {
                  const sorted = [...meldCards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
                  isRun = true;
                  for (let i = 0; i < sorted.length - 1; i++) {
                      if (getRankValue(sorted[i+1].rank) !== getRankValue(sorted[i].rank) + 1) {
                          isRun = false; 
                          break;
                      }
                  }
              }
          }

          if (!isSet && !isRun) return { ...prev, gameMessage: "Invalid: Must be Set (Same Rank) or Run (Same Suit, Sequence)." };
          
          const newPlayers = [...prev.players];
          newPlayers[0] = {
              ...newPlayers[0],
              melds: [...newPlayers[0].melds, meldCards],
              hand: hand.filter(c => !selectedCardIds.has(c.id))
          };
          
          return { ...prev, players: newPlayers, gameMessage: "Meld placed! Discard to end turn." };
      });
      setSelectedCardIds(new Set());
  };

  const handleRummyDiscard = () => {
      if (selectedCardIds.size !== 1) { setGameState(prev => ({...prev, gameMessage: "Select 1 card to discard."})); return; }
      const discardId = Array.from(selectedCardIds)[0];
      setGameState(prev => {
          const newPlayers = [...prev.players];
          const card = newPlayers[0].hand.find(c => c.id === discardId);
          if (!card) return prev;
          
          newPlayers[0] = {
              ...newPlayers[0],
              hand: newPlayers[0].hand.filter(c => c.id !== discardId)
          };
          
          const newDiscard = [...prev.discardPile, card];
          if (newPlayers[0].hand.length === 0) {
              setTimeout(() => performResolution(newPlayers, [], []), 500);
              return { ...prev, players: newPlayers, discardPile: newDiscard, isGameOver: true };
          }
          return { ...prev, players: newPlayers, discardPile: newDiscard, activePlayerId: getNextPlayerId('p1', newPlayers), gameMessage: "Opponents thinking..." };
      });
      setSelectedCardIds(new Set());
      setRoundPhase('RUMMY_DRAW');
  };

  // --- SHARED ACTIONS ---
  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cardId)) {
            newSet.delete(cardId);
        } else {
            // For Rummy discard, enforce single select via UI but here allow toggle
            // For Rummy Meld, allow multiple
            // For Poker Swap, allow up to 3
            if (roundPhase === 'SWAPPING' && newSet.size >= 3) return prev; 
            newSet.add(cardId);
        }
        return newSet;
    });
  };

  const executeSwap = () => {
    setGameState(prev => {
        const newDeck = [...prev.deck];
        const newPlayers = [...prev.players];
        const p1 = { ...newPlayers[0] };
        
        const keptCards = p1.hand.filter(c => !selectedCardIds.has(c.id));
        const numToDraw = p1.hand.length - keptCards.length;
        
        const newCards: CardData[] = [];
        for (let i = 0; i < numToDraw; i++) {
            const c = newDeck.pop();
            if (c) {
                c.isFaceUp = true;
                newCards.push(c);
            }
        }
        
        p1.hand = [...keptCards, ...newCards];
        p1.lastAction = numToDraw > 0 ? "SWAPPED" : "KEPT HAND";
        newPlayers[0] = p1;

        return {
            ...prev,
            players: newPlayers,
            deck: newDeck,
            activePlayerId: 'p1', 
            gameMessage: "Pookie's Turn."
        };
    });
    setRoundPhase('PLAYING');
    setSelectedCardIds(new Set());
  };


  // --- SOLITAIRE LOGIC ---

  const checkSolitaireWin = (foundations: CardData[][]) => {
     const totalCards = foundations.reduce((sum, pile) => sum + pile.length, 0);
     if (totalCards === 52) {
       setWinnerName("Pookie");
       setRoundPhase('VICTORY');
       setGameState(prev => ({...prev, isGameOver: true, gameMessage: "SOLITAIRE COMPLETE!"}));
     }
  };

  const setupSolitaire = (deck: CardData[]) => {
    const tableau: CardData[][] = [[], [], [], [], [], [], []];
    let cardIdx = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) {
        const card = { ...deck[cardIdx], isFaceUp: j === i };
        tableau[i].push(card);
        cardIdx++;
      }
    }
    setSolitaireState({ tableau, foundations: [[], [], [], []], stock: deck.slice(cardIdx), waste: [] });
    setGameState(prev => ({ ...prev, gameMessage: 'Good Luck Pookie!' }));
  };

  const handleSolitaireDoubleClick = (card: CardData) => {
    if (!card.isFaceUp) return;
    const foundations = [...solitaireState.foundations];
    let moved = false;
    let targetFoundationIdx = -1;
    for (let i = 0; i < 4; i++) {
        const pile = foundations[i];
        const topCard = pile.length > 0 ? pile[pile.length-1] : null;
        let valid = false;
        if (!topCard) {
            if (card.rank === Rank.ACE) valid = true;
        } else {
            if (card.suit === topCard.suit && getRankValue(card.rank) === getRankValue(topCard.rank) + 1) {
                valid = true;
            }
        }
        if (valid) {
            targetFoundationIdx = i;
            moved = true;
            break;
        }
    }
    if (moved) {
        let foundSource = false;
        const waste = [...solitaireState.waste];
        if (waste.length > 0 && waste[waste.length-1].id === card.id) {
            waste.pop();
            foundSource = true;
            setSolitaireState(prev => ({ ...prev, waste, foundations: updateFoundation(prev.foundations, targetFoundationIdx, card) }));
        }
        if (!foundSource) {
            const tableau = solitaireState.tableau.map(col => [...col]);
            tableau.forEach(col => {
                if (col.length > 0 && col[col.length-1].id === card.id) {
                    col.pop();
                    if (col.length > 0) col[col.length-1].isFaceUp = true;
                    foundSource = true;
                }
            });
            if (foundSource) {
                 setSolitaireState(prev => ({ ...prev, tableau, foundations: updateFoundation(prev.foundations, targetFoundationIdx, card) }));
            }
        }
        if (foundSource) {
            setGameState(prev => {
                const newPlayers = [...prev.players];
                newPlayers[0] = { ...newPlayers[0], chips: newPlayers[0].chips + SOLITAIRE_REWARD };
                return {...prev, players: newPlayers};
            });
        }
    }
  };
  
  const updateFoundation = (currentFoundations: CardData[][], idx: number, card: CardData) => {
      const newFoundations = currentFoundations.map(p => [...p]);
      newFoundations[idx].push(card);
      checkSolitaireWin(newFoundations);
      return newFoundations;
  };

  const drawStock = () => {
    if (solitaireState.stock.length === 0) {
      const newStock = [...solitaireState.waste].reverse().map(c => ({...c, isFaceUp: false}));
      setSolitaireState(prev => ({ ...prev, stock: newStock, waste: [] }));
    } else {
      const card = solitaireState.stock[0];
      setSolitaireState(prev => ({
        ...prev,
        stock: prev.stock.slice(1),
        waste: [...prev.waste, { ...card, isFaceUp: true }]
      }));
    }
  };

  // --- DRAG AND DROP (SOLITAIRE) ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current as CardData;
    setActiveDragCard(card);
    let stack: CardData[] = [card];
    if (gameType === GameType.SOLITAIRE) {
        solitaireState.tableau.forEach(col => {
            const idx = col.findIndex(c => c.id === card.id);
            if (idx !== -1) {
                stack = col.slice(idx);
            }
        });
    }
    setActiveDragStack(stack);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragCard(null);
    setActiveDragStack([]);
    if (!over) return;
    const sourceCard = active.data.current as CardData;
    const dropId = over.id as string;
    let sourcePile: 'tableau' | 'waste' | 'foundation' | null = null;
    let sourceIdx = -1;
    let cardIdx = -1;

    // Find Source
    solitaireState.tableau.forEach((col, idx) => {
      const cIdx = col.findIndex(c => c.id === sourceCard.id);
      if (cIdx !== -1) { sourcePile = 'tableau'; sourceIdx = idx; cardIdx = cIdx; }
    });
    if (sourcePile === null) {
      const wIdx = solitaireState.waste.findIndex(c => c.id === sourceCard.id);
      if (wIdx !== -1 && wIdx === solitaireState.waste.length - 1) { sourcePile = 'waste'; sourceIdx = 0; cardIdx = wIdx; }
    }
    if (sourcePile === null) {
        solitaireState.foundations.forEach((pile, idx) => {
             if (pile.length > 0 && pile[pile.length-1].id === sourceCard.id) { sourcePile = 'foundation'; sourceIdx = idx; cardIdx = pile.length - 1; }
        });
    }
    if (!sourcePile) return;

    // Handle Tableau Drop
    if (dropId.startsWith('tableau-col-')) {
      const targetColIdx = parseInt(dropId.split('-')[2]);
      const targetCol = solitaireState.tableau[targetColIdx];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : null;

      let valid = false;
      if (!targetCard) {
        if (sourceCard.rank === Rank.KING) valid = true;
      } else {
        if (isOppositeColor(sourceCard, targetCard) && getRankValue(sourceCard.rank) === getRankValue(targetCard.rank) - 1) {
          valid = true;
        }
      }
      if (valid) moveCards(sourcePile, sourceIdx, cardIdx, 'tableau', targetColIdx);
    } 
    // Handle Foundation Drop
    else if (dropId.startsWith('foundation-')) {
      const targetIdx = parseInt(dropId.split('-')[1]);
      const targetPile = solitaireState.foundations[targetIdx];
      const targetCard = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;
      if (sourcePile === 'tableau' && cardIdx !== solitaireState.tableau[sourceIdx].length - 1) return; // Can only move top card to foundation
      
      let valid = false;
      if (!targetCard) {
        if (sourceCard.rank === Rank.ACE) valid = true;
      } else {
        if (sourceCard.suit === targetCard.suit && getRankValue(sourceCard.rank) === getRankValue(targetCard.rank) + 1) {
          valid = true;
        }
      }
      if (valid) {
        moveCards(sourcePile, sourceIdx, cardIdx, 'foundation', targetIdx);
        setGameState(prev => {
            const newPlayers = [...prev.players];
            newPlayers[0] = { ...newPlayers[0], chips: newPlayers[0].chips + SOLITAIRE_REWARD };
            return {...prev, players: newPlayers};
        });
      }
    }
  };

  const moveCards = (fromType: string, fromIdx: number, cardIdx: number, toType: string, toIdx: number) => {
    setSolitaireState(prev => {
      const newTableau = prev.tableau.map(col => [...col]);
      const newFoundations = prev.foundations.map(pile => [...pile]);
      const newWaste = [...prev.waste];
      let cardsToMove: CardData[] = [];
      
      if (fromType === 'tableau') {
        cardsToMove = newTableau[fromIdx].splice(cardIdx);
        if (newTableau[fromIdx].length > 0) {
          newTableau[fromIdx][newTableau[fromIdx].length - 1].isFaceUp = true;
        }
      } else if (fromType === 'waste') {
        cardsToMove = [newWaste.pop()!];
      } else if (fromType === 'foundation') {
        cardsToMove = [newFoundations[fromIdx].pop()!];
      }
      
      if (toType === 'tableau') {
        newTableau[toIdx].push(...cardsToMove);
      } else if (toType === 'foundation') {
        newFoundations[toIdx].push(...cardsToMove);
        checkSolitaireWin(newFoundations);
      }
      return { ...prev, tableau: newTableau, foundations: newFoundations, waste: newWaste };
    });
  };

  // --- RESOLUTION ---
  const performResolution = (players: Player[], dealerHand: CardData[], deck: CardData[]) => {
    // 1. Set phase to RESOLVING to prevent further interactions, but don't show overlay yet
    setRoundPhase('RESOLVING');
    
    let message = '';
    let winner: string | null = null;
    
    // Deep copy to allow mutation during calculation
    const newPlayers = players.map(p => ({
        ...p,
        hand: p.hand.map(c => ({...c})),
        melds: p.melds ? p.melds.map(m => [...m]) : []
    }));
    
    // Reveal Dealer Hand
    const finalDealerHand = dealerHand.map(c => ({...c, isFaceUp: true}));

    if (gameType === GameType.RUMMY) {
        const winnerIdx = newPlayers.findIndex(p => p.hand.length === 0);
        if (winnerIdx !== -1) {
            const isPookie = newPlayers[winnerIdx].id === 'p1';
            winner = isPookie ? 'Pookie' : 'Opponent';
            message = `${newPlayers[winnerIdx].name} Wins!`;
            if (isPookie) {
                 newPlayers[0].chips += gameState.pot + RUMMY_REWARD;
            }
        } else {
            message = "Draw / No Winner";
        }
    } else if (gameType === GameType.BLACKJACK) {
        const dealerScore = calculateBlackjackScore(finalDealerHand);
        const playerScore = calculateBlackjackScore(newPlayers[0].hand);
      
        let chipsToAdd = 0;
        if (newPlayers[0].status === 'bust') {
            message = 'Bust! Sachi Wins.';
        } else if (dealerScore > 21) {
            message = 'Sachi Busts! Pookie Wins!';
            chipsToAdd = newPlayers[0].currentBet * 2;
            winner = 'Pookie';
        } else if (playerScore > dealerScore) {
            message = 'Pookie Wins!';
            chipsToAdd = newPlayers[0].currentBet * 2;
            winner = 'Pookie';
        } else if (playerScore === dealerScore) {
            message = 'Push.';
            chipsToAdd = newPlayers[0].currentBet;
        } else {
            message = 'Sachi Wins.';
        }
        
        if (chipsToAdd > 0) {
            newPlayers[0].chips += chipsToAdd;
        }
    } else {
      // Poker/Holdem Resolution
      // In a real simulation we'd compare hands. Here random for demo.
      // Logic: If Pookie hasn't folded, random chance against bots that haven't folded.
      const activePlayers = newPlayers.filter(p => p.status !== 'folded');
      if (activePlayers.length === 1) {
          // Everyone else folded
          const w = activePlayers[0];
          message = `${w.name} Wins (Others Folded)!`;
          if (w.id === 'p1') {
              winner = 'Pookie';
              newPlayers[0].chips += gameState.pot;
          }
      } else {
          // Showdown
          const winnerIndex = Math.floor(Math.random() * activePlayers.length);
          const w = activePlayers[winnerIndex];
          message = `${w.name} Wins the Pot!`;
          if (w.id === 'p1') {
              winner = 'Pookie';
              newPlayers[0].chips += gameState.pot;
          }
      }
    }

    // Reveal all bot cards
    newPlayers.forEach(p => {
        if (p.isBot) {
            p.hand.forEach(c => c.isFaceUp = true);
        }
    });

    // Update board state immediately so user sees cards
    setGameState(prev => ({ 
        ...prev, 
        players: newPlayers, 
        dealerHand: finalDealerHand,
        gameMessage: message, 
        isGameOver: true 
    }));
    
    // Delay overlay
    setTimeout(() => {
        if (winner === 'Pookie') {
            setWinnerName('Pookie');
            setRoundPhase('VICTORY');
        } else {
            setRoundPhase('ROUND_OVER');
        }
    }, 4000); // 4 seconds delay to see the showdown
  };

  const handleNextRound = () => {
    if ((gameState.players[0]?.chips || 0) <= 0) {
      onGameOver(0);
    } else {
      setRoundPhase('BETTING');
      setWinnerName(null);
      setGameState(prev => ({
        ...prev,
        deck: [],
        discardPile: [],
        dealerHand: [],
        communityCards: [],
        players: prev.players.map(p => ({...p, hand: [], melds: [], currentBet: 0, status: 'active'})),
        gameMessage: "Place your bet.",
        isGameOver: false,
        pot: 0,
        activePlayerId: null,
        holdEmStage: 'PREFLOP'
      }));
    }
  };

  // --- RENDERERS ---

  const renderMultiplayerTable = () => (
    <div className="flex flex-col h-full w-full relative">

      {/* --- DEALER AREA (TOP CENTER) --- */}
      <div className="absolute top-[8%] left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10">
         {/* Dealer Avatar */}
         <div className="mb-2 relative">
             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold shadow-[0_0_15px_rgba(255,215,0,0.5)] bg-gray-900">
                <img src={DEALER_AVATAR} alt="Sachi" className="w-full h-full object-cover" />
             </div>
             <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-black/80 border border-gold/50 text-gold text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                DEALER
             </div>
         </div>
         
         <div className="flex items-center gap-2 mb-2 px-4 py-1 rounded-full bg-black/60 border border-gold/30 text-gold shadow-lg backdrop-blur-sm animate-fade-in">
            <User size={18} /> <span className="font-serif font-bold tracking-widest">SACHI</span>
         </div>
         {/* Show Dealer Cards only if Blackjack or Poker */}
         {(gameType === GameType.BLACKJACK || gameType === GameType.POKER) && (
             <div className="flex justify-center -space-x-12">
                {gameState.dealerHand.map((card, i) => (
                    <div key={card.id} className={i > 0 ? "shadow-xl transform scale-75 origin-top" : "shadow-xl transform scale-75 origin-top"}>
                         <Card card={card} />
                    </div>
                ))}
             </div>
         )}
      </div>
      
      {/* --- CENTER AREA: Community Cards / Rummy Piles (Dealer Moved Out) --- */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-4 w-full px-4">
         {gameType === GameType.RUMMY ? (
             <div className="flex gap-8">
               {/* Discard & Stock Logic */}
               <div onClick={() => handleRummyDraw('DISCARD')} className={`relative w-24 h-36 border-2 border-white/20 rounded-xl flex items-center justify-center ${roundPhase === 'RUMMY_DRAW' && gameState.activePlayerId === 'p1' ? 'cursor-pointer hover:scale-105 ring-4 ring-green-400' : ''}`}>
                   {gameState.discardPile.length > 0 ? (
                       <Card card={gameState.discardPile[gameState.discardPile.length-1]} isDraggable={false} />
                   ) : <div className="text-white/20 font-bold">DISCARD</div>}
               </div>
               <div onClick={() => handleRummyDraw('STOCK')} className={`relative w-24 h-36 bg-pookie-black rounded-xl border-2 border-white shadow-xl ${roundPhase === 'RUMMY_DRAW' && gameState.activePlayerId === 'p1' ? 'cursor-pointer hover:scale-105 ring-4 ring-green-400' : ''}`}>
                    <div className="w-full h-full bg-gradient-to-br from-pookie-pink to-black opacity-80 rounded-lg"></div>
               </div>
             </div>
         ) : gameType === GameType.TEXAS_HOLDEM ? (
             <div className="flex gap-2">
                 {/* Community Cards */}
                 {gameState.communityCards.map((card, i) => (
                     <div key={card.id} className="animate-fade-in">
                         <Card card={card} />
                     </div>
                 ))}
                 {/* Empty Slots placeholders */}
                 {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
                     <div key={i} className="w-24 h-36 border-2 border-white/10 rounded-xl bg-black/20"></div>
                 ))}
             </div>
         ) : null}
      </div>

      {/* --- BOTS (Dynamic Positioning) --- */}
      {gameState.players.slice(1).map((bot, index) => {
         let posClass = '';
         // Distribute 3 or 4 bots
         // 0: Top Left
         // 1: Top Right
         // 2: Mid Left
         // 3: Mid Right
         if (index === 0) posClass = 'top-[18%] left-4';
         else if (index === 1) posClass = 'top-[18%] right-4';
         else if (index === 2) posClass = 'top-[45%] left-4';
         else if (index === 3) posClass = 'top-[45%] right-4';
         
         return (
        <div key={bot.id} className={`absolute ${posClass} flex flex-col items-center transition-all ${bot.status === 'folded' ? 'opacity-40 grayscale' : ''}`}>
           {/* Bot Avatar */}
           <div className="mb-2 w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg bg-gray-800">
              <img src={BOT_AVATARS[bot.name]} alt={bot.name} className="w-full h-full object-cover" />
           </div>

           <div className={`flex items-center gap-2 mb-2 px-3 py-1 rounded-full text-white backdrop-blur-sm border ${gameState.activePlayerId === bot.id ? 'bg-pookie-pink border-white' : 'bg-black/50 border-white/10'}`}>
            <Cpu size={16} /> <span>{bot.name}</span>
          </div>
           {bot.lastAction && (
             <div className="absolute -top-8 bg-white text-black font-bold px-3 py-1 rounded-lg animate-bounce shadow-lg text-xs z-30">
                 {bot.lastAction}
             </div>
          )}
          <div className="flex -space-x-12 mb-2">
             {bot.hand.map((card) => <Card key={card.id} card={{...card, isFaceUp: gameState.isGameOver}} className="scale-75 origin-top-left" />)}
          </div>
        </div>
      )})}

      {/* --- POT & MESSAGE --- */}
      <div className={`absolute ${gameType === GameType.RUMMY || gameType === GameType.TEXAS_HOLDEM ? 'top-[25%]' : 'top-1/2'} left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-md pointer-events-none z-20`}>
        <div className="bg-pookie-gray/80 p-4 rounded-2xl border border-pookie-pink/30 backdrop-blur-md shadow-2xl inline-block">
          <div className="text-gold text-xl font-bold font-mono mb-1 flex items-center justify-center gap-2">
             <Coins className="text-yellow-400" /> ${gameState.pot}
          </div>
          <div className="text-pookie-pink-light text-md font-medium">{gameState.gameMessage}</div>
        </div>
      </div>
      
      {/* --- PLAYER MELDS (Right Side) --- */}
      {gameState.players[0].melds.length > 0 && (
         <div className="absolute right-6 bottom-24 flex flex-col gap-2 items-end z-20 pointer-events-none">
             <div className="text-white text-xs font-bold bg-black/60 px-2 py-0.5 rounded border border-white/10 mb-1">YOUR SETS</div>
             {gameState.players[0].melds.map((meld, mIdx) => (
                  <div key={mIdx} className="flex -space-x-10 p-2 bg-black/50 rounded-xl border border-white/10 pointer-events-auto hover:bg-black/70 transition-colors">
                      {meld.map(c => <Card key={c.id} card={{...c, isFaceUp: true}} className="scale-60 origin-top-left" />)}
                  </div>
              ))}
         </div>
      )}

      {/* --- PLAYER AREA --- */}
      <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center w-full max-w-4xl px-4 transition-all duration-500`}>
        {/* Action Bubble */}
        {gameState.players[0]?.lastAction && (
             <div className="mb-4 bg-pookie-pink text-white font-bold px-4 py-2 rounded-lg animate-bounce shadow-lg">
                 {gameState.players[0].lastAction}
             </div>
        )}
        
        {/* Rummy Melds Removed from here */}

        {/* Player Hand */}
        <div className={`flex justify-center mb-6 min-h-[160px] perspective-1000 p-4 rounded-xl ${gameState.activePlayerId === 'p1' ? 'bg-white/5 border border-pookie-pink/30 shadow-[0_0_20px_rgba(255,105,180,0.2)]' : ''}`}>
           {gameState.players[0]?.hand.map((card, i) => (
              <div key={card.id} className={`transition-all duration-300 ${i > 0 ? "-ml-12" : ""} hover:-translate-y-4`}>
                <Card 
                  card={card} 
                  selected={selectedCardIds.has(card.id)} 
                  onClick={() => toggleCardSelection(card.id)}
                />
              </div>
           ))}
        </div>

        {/* Dashboard */}
        <div className="flex items-center gap-6 w-full justify-center">
           <div className="hidden md:flex flex-col bg-pookie-gray/80 p-3 rounded-xl border border-white/10 text-right min-w-[120px]">
             <span className="text-xs text-gray-400 uppercase tracking-wider">Balance</span>
             <span className="text-2xl font-bold text-pookie-pink font-mono">${gameState.players[0]?.chips || 0}</span>
           </div>
           <div className="flex-1 max-w-xl">
             {renderGameControls()}
           </div>
        </div>
      </div>
    </div>
  );

  const renderBettingOverlay = () => {
    if (roundPhase !== 'BETTING') return null;
    if (gameType === GameType.SOLITAIRE) {
       const cost = SOLITAIRE_COST;
       return (
         <div className="absolute inset-0 z-40 bg-pookie-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-pookie-gray border-2 border-pookie-pink p-8 rounded-2xl text-center shadow-2xl max-w-md w-full relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pookie-blue to-pookie-pink"></div>
               <h2 className="text-4xl text-pookie-pink font-serif mb-6">{gameType}</h2>
               <div className="bg-black/40 p-6 rounded-xl mb-8 border border-white/5">
                   <div className="flex justify-between items-center mb-2"><span className="text-gray-400">Entry Fee</span><span className="text-red-400 font-bold font-mono text-xl">-${cost}</span></div>
                   <div className="flex justify-between items-center"><span className="text-gray-400">Prize</span><span className="text-emerald-400 font-bold font-mono text-xl">Winner Takes Pot</span></div>
               </div>
               <button onClick={() => { setBetAmount(cost); handlePlaceBet(); }} className="w-full bg-pookie-pink hover:bg-pookie-pink-dark text-white font-bold py-4 rounded-xl text-2xl shadow-lg transition-transform hover:scale-105 border border-white/20">PLAY</button>
            </div>
         </div>
       );
    }
    const currentChips = gameState.players[0]?.chips || 0;
    const maxBet = Math.min(currentChips, MAX_BET);
    return (
      <div className="absolute inset-0 z-40 bg-pookie-black/80 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-pookie-gray border-2 border-pookie-pink p-8 rounded-2xl text-center shadow-2xl max-w-md w-full">
           <h2 className="text-2xl text-white mb-6 font-serif">PLACE BET</h2>
           <div className="text-6xl font-mono text-pookie-pink font-bold mb-4">${betAmount}</div>
           <input type="range" min={MIN_BET} max={maxBet} step={10} value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg accent-pookie-pink mb-8" />
           <button onClick={handlePlaceBet} className="w-full bg-pookie-pink text-white font-bold py-4 rounded-xl text-2xl">DEAL</button>
        </div>
      </div>
    );
  };

  const renderGameControls = () => {
     if (roundPhase === 'BETTING' || roundPhase === 'VICTORY') return null;
     if (roundPhase === 'ROUND_OVER') {
        return (
          <div className="flex gap-4 justify-center">
             <button onClick={handleNextRound} className="bg-pookie-pink hover:bg-pookie-pink-light text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2"><Repeat /> PLAY AGAIN</button>
          </div>
        );
     }
     
     if (roundPhase === 'SWAPPING') {
        return (
          <div className="flex gap-4 justify-center animate-fade-in">
             <button onClick={executeSwap} className="bg-pookie-pink hover:bg-pink-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><RefreshCw size={20} /> {selectedCardIds.size > 0 ? "SWAP" : "KEEP"}</button>
          </div>
        );
     }

     if (gameType === GameType.RUMMY) {
         if (gameState.activePlayerId !== 'p1') {
             return <div className="text-white bg-black/50 px-4 py-2 rounded-lg animate-pulse">Waiting for opponents...</div>;
         }
         
         if (roundPhase === 'RUMMY_DRAW') {
             return <div className="text-white text-xl font-bold drop-shadow-md">Draw a Card from Stock or Discard</div>;
         }

         return (
           <div className="flex gap-4 justify-center">
               <button onClick={handleRummyMeld} disabled={selectedCardIds.size < 3} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Layers /> MELD SET/RUN</button>
               <button onClick={handleRummyDiscard} disabled={selectedCardIds.size !== 1} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Trash2 /> DISCARD & END</button>
           </div>
         );
     }
     
     if (gameState.activePlayerId !== 'p1') return <div className="text-white bg-black/50 px-4 py-2 rounded-lg">Opponent Turn...</div>;
     
     return (
       <div className="flex items-center gap-4 justify-center bg-pookie-gray/90 p-3 rounded-2xl border border-pookie-pink/30 shadow-2xl backdrop-blur-md">
          {gameType === GameType.BLACKJACK ? (
             <>
               <button onClick={handleHit} className="px-6 py-2 bg-pookie-blue rounded-lg text-black font-bold hover:bg-cyan-400">HIT</button>
               <button onClick={handleStand} className="px-6 py-2 bg-pookie-pink rounded-lg text-white font-bold hover:bg-pink-400">STAND</button>
             </>
          ) : (
             <>
                  <button onClick={handleFold} className="px-4 py-2 bg-gray-700 rounded-lg text-white font-bold hover:bg-gray-600">FOLD</button>
                  <button onClick={handleCheck} className="px-4 py-2 bg-pookie-purple rounded-lg text-black font-bold hover:bg-purple-300">CHECK</button>
                  <button onClick={handleCall} className="px-4 py-2 bg-pookie-blue rounded-lg text-black font-bold hover:bg-cyan-300">CALL</button>
                  <button onClick={handleRaise} className="px-4 py-2 bg-pookie-pink rounded-lg text-white font-bold hover:bg-pink-400">RAISE</button>
             </>
          )}
       </div>
     );
  };

  const renderSolitaire = () => (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="flex flex-col h-full w-full p-4 overflow-hidden relative">
        <div className="flex justify-between items-start mb-8 z-10">
          <div className="flex gap-4">
             <div onClick={drawStock} className="cursor-pointer relative group">
                {solitaireState.stock.length > 0 ? (
                  <div className="w-24 h-36 bg-pookie-black rounded-xl border-2 border-white shadow-xl group-hover:scale-105 transition-transform overflow-hidden relative">
                       <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                       <div className="w-full h-full bg-gradient-to-br from-pookie-pink to-black opacity-80"></div>
                  </div>
                ) : (
                  <div className="w-24 h-36 border-2 border-white/20 rounded-xl flex items-center justify-center text-white/20 bg-black/20">RELOAD</div>
                )}
             </div>
             <div className="relative">
               {solitaireState.waste.length > 0 && (
                  <Card card={solitaireState.waste[solitaireState.waste.length-1]} isDraggable={true} onDoubleClick={() => handleSolitaireDoubleClick(solitaireState.waste[solitaireState.waste.length-1])} />
               )}
             </div>
          </div>
          <div className="bg-black/40 px-6 py-2 rounded-full border border-pookie-pink/40 backdrop-blur-sm text-center">
              <div className="text-xs text-pookie-pink uppercase tracking-wider">Pookie's Balance</div>
              <div className="text-xl font-bold text-white font-mono">${gameState.players[0]?.chips || 0}</div>
          </div>
          <div className="flex gap-4">
            {solitaireState.foundations.map((pile, i) => {
               const topCard = pile.length > 0 ? pile[pile.length-1] : null;
               return (
                 <DropZone key={i} id={`foundation-${i}`} className="w-24 h-36 border-2 border-pookie-pink/20 rounded-xl bg-black/20 flex items-center justify-center">
                    {topCard ? <Card card={topCard} isDraggable={true} /> : <span className="text-3xl opacity-10 text-white font-serif">{['♥','♦','♣','♠'][i]}</span>}
                 </DropZone>
               );
            })}
          </div>
        </div>
        <div className="flex justify-between gap-2 flex-1 relative z-10 px-4 h-full">
          {solitaireState.tableau.map((column, colIndex) => (
            <DropZone key={colIndex} id={`tableau-col-${colIndex}`} className="flex flex-col relative w-24 h-full min-h-[400px]">
              {column.map((card, cardIndex) => {
                const isBeingDragged = activeDragStack.some(c => c.id === card.id);
                return (
                <div key={card.id} className="absolute w-full" style={{ top: `${cardIndex * 35}px`, zIndex: cardIndex }}>
                  <Card card={card} isDraggable={card.isFaceUp} onDoubleClick={() => handleSolitaireDoubleClick(card)} forceOpacity={isBeingDragged ? 0 : undefined} />
                </div>
              )})}
            </DropZone>
          ))}
        </div>
        <DragOverlay>
           {activeDragStack.length > 0 ? (
             <div className="relative">
                {activeDragStack.map((card, index) => (
                   <div key={card.id} className="absolute w-full" style={{ top: `${index * 35}px`, zIndex: index }}>
                      <Card card={card} className="opacity-90 shadow-2xl rotate-3" isDraggable={false} />
                   </div>
                ))}
             </div>
           ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );

  const backgroundUrl = BACKGROUNDS[gameType] || BACKGROUNDS.MENU;
  const renderOverlay = () => {
      if(roundPhase === 'VICTORY') return (
       <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="relative bg-cover bg-center border-4 border-gold rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full h-[500px] flex flex-col items-center justify-end pb-8" style={{ backgroundImage: `url(${WIN_BACKGROUNDS[gameType]})` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="relative z-10 text-center animate-bounce-slow">
                  <Trophy className="text-gold mx-auto mb-4 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" size={80} />
                  <h1 className="text-6xl font-serif text-white font-bold mb-2 text-stroke-gold drop-shadow-lg">VICTORY!</h1>
                  <p className="text-2xl text-pookie-pink font-bold mb-8 drop-shadow-md">Pookie Wins!</p>
                  <div className="flex gap-4 justify-center">
                    <button onClick={handleNextRound} className="bg-gold hover:bg-yellow-400 text-black px-8 py-3 rounded-full font-bold text-xl shadow-lg transform hover:scale-105 transition-all">PLAY AGAIN</button>
                    <button onClick={() => onClose(gameState.players[0]?.chips || 0)} className="bg-black/80 hover:bg-gray-800 text-white px-8 py-3 rounded-full font-bold text-xl border border-white/20 backdrop-blur-sm">MAIN MENU</button>
                  </div>
              </div>
          </div>
       </div>
     );
     return renderBettingOverlay();
  }

  return (
    <div className="w-full h-full relative shadow-inner overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${backgroundUrl})` }}>
       <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
       <button onClick={() => onClose(gameState.players[0]?.chips || 0)} className="absolute bottom-4 right-4 z-50 text-white/60 hover:text-white font-bold bg-black/30 hover:bg-red-900/50 px-4 py-2 rounded-full transition-all flex items-center gap-2 border border-transparent hover:border-red-500/30">
        <XOctagon size={16} /> QUIT
      </button>
      {renderOverlay()}
      {gameType === GameType.SOLITAIRE ? renderSolitaire() : renderMultiplayerTable()}
    </div>
  );
};

export default GameBoard;