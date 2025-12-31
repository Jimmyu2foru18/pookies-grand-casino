import React, { useState } from 'react';
import { AppPhase, GameType } from './types';
import { BACKGROUNDS, DISCLAIMER_TEXT, GAME_RULES, INITIAL_CHIPS, POOKIE_AVATAR } from './constants';
import GameBoard from './components/GameBoard';
import { Info, Play, XCircle, Coins } from 'lucide-react';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.LAUNCH);
  const [selectedGame, setSelectedGame] = useState<GameType>(GameType.BLACKJACK);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [playerChips, setPlayerChips] = useState<number>(INITIAL_CHIPS);

  const startGame = () => {
    setPhase(AppPhase.PLAYING);
  };

  const handleGameOver = (finalChips: number) => {
    setPlayerChips(finalChips);
    setPhase(AppPhase.GAME_OVER);
  };
  
  const handleGameClose = (currentChips: number) => {
    setPlayerChips(currentChips);
    setPhase(AppPhase.MENU);
  };

  const resetToMenu = () => {
    setPlayerChips(INITIAL_CHIPS);
    setPhase(AppPhase.MENU);
  };

  // --- RENDERERS ---

  if (phase === AppPhase.LAUNCH) {
    return (
      <div 
        className="w-full h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
        style={{ backgroundImage: `url(${BACKGROUNDS.LAUNCH})` }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div className="relative z-10 bg-pookie-gray border-4 border-pookie-pink p-8 rounded-2xl max-w-2xl text-center text-white shadow-[0_0_50px_rgba(255,105,180,0.5)]">
          <h1 className="text-6xl font-serif text-white mb-6 tracking-wider drop-shadow-[0_2px_2px_rgba(255,105,180,0.8)]">
            <span className="text-pookie-pink">POOKIE'S GRAND</span> CASINO
          </h1>
          <div className="bg-black/60 p-6 rounded-xl text-left mb-8 max-h-60 overflow-y-auto border border-white/10">
            <h3 className="text-pookie-pink-light font-bold mb-2 flex items-center gap-2">
              <Info size={20} /> IMPORTANT NOTICE
            </h3>
            <pre className="whitespace-pre-wrap font-sans text-gray-300 text-sm leading-relaxed">
              {DISCLAIMER_TEXT}
            </pre>
          </div>
          <button 
            onClick={() => setPhase(AppPhase.MENU)}
            className="bg-pookie-pink hover:bg-pookie-pink-dark text-white font-bold py-4 px-12 rounded-full text-xl transition-all transform hover:scale-105 shadow-lg border-2 border-white/20"
          >
            I ACCEPT
          </button>
        </div>
      </div>
    );
  }

  if (phase === AppPhase.GAME_OVER) {
    return (
      <div 
        className="w-full h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
        style={{ backgroundImage: `url(${BACKGROUNDS.GAME_OVER})` }}
      >
        <div className="absolute inset-0 bg-black/80"></div>
        <div className="relative z-10 text-center animate-fade-in p-10 border-2 border-pookie-pink rounded-3xl bg-black/50 backdrop-blur-md">
          <h2 className="text-6xl font-bold text-pookie-pink mb-4 font-serif drop-shadow-lg">GAME OVER</h2>
          <p className="text-2xl text-white mb-8">Pookie has run out of chips.</p>
          <button 
            onClick={resetToMenu}
            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black font-bold py-3 px-8 rounded-full transition-all"
          >
            RETURN TO MENU
          </button>
        </div>
      </div>
    );
  }

  if (phase === AppPhase.PLAYING) {
    return (
      <div className="w-full h-screen overflow-hidden">
        {showInstructions && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
             <div className="bg-pookie-gray border-2 border-pookie-pink rounded-xl p-6 max-w-lg w-full shadow-[0_0_30px_rgba(255,105,180,0.3)]">
               <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                 <h3 className="text-2xl text-pookie-pink font-serif">{selectedGame} Rules</h3>
                 <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-white">
                   <XCircle />
                 </button>
               </div>
               <div className="text-gray-300 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                 {GAME_RULES[selectedGame]}
               </div>
             </div>
           </div>
        )}
        
        <GameBoard 
          gameType={selectedGame} 
          initialChips={playerChips}
          onGameOver={handleGameOver}
          onClose={handleGameClose}
        />

        {/* Floating Instruction Button */}
        <button 
          onClick={() => setShowInstructions(true)}
          className="fixed bottom-4 left-4 z-50 bg-pookie-black/80 text-pookie-pink border border-pookie-pink p-3 rounded-full hover:bg-pookie-pink hover:text-white transition-all shadow-lg"
          title="Game Rules"
        >
          <Info />
        </button>
      </div>
    );
  }

  // DEFAULT: MENU PHASE
  return (
    <div 
      className="w-full h-screen bg-cover bg-center flex flex-col relative"
      style={{ backgroundImage: `url(${BACKGROUNDS.MENU})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90"></div>
      
      {/* Header */}
      <div className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <h1 className="text-3xl font-serif tracking-widest drop-shadow-lg text-white">
          <span className="text-pookie-pink">POOKIE'S GRAND</span> CASINO
        </h1>
        <div className="flex items-center gap-4 bg-black/50 pr-2 pl-6 py-1 rounded-full border border-pookie-pink/30 shadow-lg">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-pookie-pink uppercase font-bold tracking-wider">Pookie's Balance</p>
            <p className="text-xl font-bold text-white font-mono">${playerChips.toLocaleString()}</p>
          </div>
          <div className="relative group cursor-pointer">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pookie-pink shadow-lg bg-gray-200 group-hover:scale-105 transition-transform">
              <img src={POOKIE_AVATAR} alt="Pookie" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-black"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 p-4">
        
        <div className="bg-pookie-gray/90 p-8 rounded-2xl border-2 border-pookie-pink/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-md backdrop-blur-md">
          
          {/* Prominent Balance Display */}
          <div className="flex flex-col items-center justify-center mb-8 border-b border-white/10 pb-6">
            <div className="flex items-center gap-2 mb-2 text-pookie-pink">
               <Coins size={24} />
               <span className="text-sm font-bold uppercase tracking-widest">Available Funds</span>
            </div>
            <div className="text-5xl font-mono font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center gap-1">
              <span className="text-2xl text-pookie-pink self-start mt-2">$</span>
              {playerChips.toLocaleString()}
            </div>
          </div>

          <label className="block text-pookie-pink text-sm font-bold mb-2 uppercase tracking-wide">Select Game Mode</label>
          <div className="relative">
            <select 
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value as GameType)}
              className="block w-full bg-black border border-gray-600 text-white py-4 px-4 pr-8 rounded leading-tight focus:outline-none focus:border-pookie-pink focus:ring-1 focus:ring-pookie-pink text-lg appearance-none cursor-pointer hover:bg-gray-900 transition-colors"
            >
              {Object.values(GameType).map((game) => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-pookie-pink">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <button 
              onClick={startGame}
              className="w-full bg-gradient-to-r from-pookie-pink to-pookie-pink-dark hover:from-pookie-pink-light hover:to-pookie-pink text-white font-bold py-4 rounded shadow-lg flex items-center justify-center gap-2 text-xl transition-all border border-white/10"
            >
              <Play fill="white" size={24}/> PLAY NOW
            </button>
            
            <button 
              onClick={() => setShowInstructions(true)}
              className="w-full bg-transparent border border-gray-500 hover:border-pookie-pink text-gray-300 hover:text-white py-3 rounded transition-all flex items-center justify-center gap-2"
            >
              <Info size={18} /> Rules
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Modal (Menu Scope) */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-pookie-gray border-2 border-pookie-pink rounded-xl p-8 max-w-2xl w-full shadow-2xl transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h3 className="text-3xl text-pookie-pink font-serif">{selectedGame}</h3>
              <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-white transition-colors">
                <XCircle size={32} />
              </button>
            </div>
            <div className="text-gray-300 whitespace-pre-wrap font-sans text-lg leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              {GAME_RULES[selectedGame]}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;