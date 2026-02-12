// app/game/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion'; 
import confetti from 'canvas-confetti';

type GameState = {
  id: string;
  board: string;
  status: string;
  turn: string;
  player1: { username: string; id: string };
  player2?: { username: string; id: string };
  me: string;
  moves?: { playerId: string; position: number }[];
  winnerId?: string;
};

export default function GameBoard() {
  const { id } = useParams();
  const router = useRouter();
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState('');
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayStep, setReplayStep] = useState(0);

  // Helper: Winning Line
  const getWinningIndices = (boardStr: string) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    const board = boardStr.split('');
    for (const [a, b, c] of lines) {
      if (board[a] !== '-' && board[a] === board[b] && board[a] === board[c]) {
        return [a, b, c];
      }
    }
    return [];
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${id}`);
      if (res.status === 401) {
        const currentPath = window.location.pathname;
        router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setGame(prev => {
           if (prev?.status !== 'FINISHED' && data.status === 'FINISHED') {
             const winningIndices = getWinningIndices(data.board);
             if (winningIndices.length > 0) {
                const winnerSymbol = data.board[winningIndices[0]];
                const isPlayer1 = data.me === data.player1.id;
                const isPlayer2 = data.me === data.player2?.id;
                const isSpectator = !isPlayer1 && !isPlayer2;
                const mySymbol = isPlayer1 ? 'X' : 'O';
                const shouldFireConfetti = isSpectator || (mySymbol === winnerSymbol);

                if (shouldFireConfetti) {
                    const duration = 3000;
                    const end = Date.now() + duration;
                    (function frame() {
                      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#EF4444', '#3B82F6', '#F59E0B'] });
                      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#EF4444', '#3B82F6', '#F59E0B'] });
                      if (Date.now() < end) requestAnimationFrame(frame);
                    }());
                }
             }
           }
           return data;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const handleCellClick = async (index: number) => {
    if (!game || isReplayMode) return;
    const isSpectator = game.me !== game.player1.id && game.me !== game.player2?.id;
    if (isSpectator) return;
    if (game.status !== 'IN_PROGRESS') return;
    if (game.turn !== game.me) return; 
    
    try {
      const res = await fetch(`/api/games/${id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: index }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error); 
        fetchGame();
      } else {
        fetchGame();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white animate-pulse">Loading Arena...</div>;
  if (!game) return <div className="flex h-screen items-center justify-center bg-gray-900 text-red-500">Game Not Found</div>;

  const amIPlayer1 = game.me === game.player1.id;
  const amIPlayer2 = game.me === game.player2?.id;
  const isSpectator = !amIPlayer1 && !amIPlayer2;
  const isMyTurn = game.turn === game.me;

  let displayBoard = game.board.split('');
  if (isReplayMode && game.moves) {
    const tempBoard = Array(9).fill('-');
    for (let i = 0; i < replayStep; i++) {
      const move = game.moves[i];
      tempBoard[move.position] = move.playerId === game.player1.id ? 'X' : 'O';
    }
    displayBoard = tempBoard;
  }

  const winningIndices = (!isReplayMode && game.status === 'FINISHED') 
    ? getWinningIndices(game.board) 
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-600 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-red-600 rounded-full blur-[100px]"></div>
      </div>

      {/* Modern Back Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-full backdrop-blur-md transition-all duration-300 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span className="text-sm font-bold hidden sm:block">Lobby</span>
      </motion.button>

      {/* Main Content */}
      <div className="z-10 w-full max-w-lg space-y-5 sm:space-y-6 mt-10 sm:mt-0">
        
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg tracking-tighter">
            TIC-TAC-TOE
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 tracking-[0.2em] uppercase font-bold">Arena Mode</p>
        </div>

        {/* 🔥 Copy Tools (Button Row Update) */}
        {!isSpectator && game.status === 'WAITING' && (
          <div className="bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50 flex flex-col gap-3 shadow-xl mx-2">
            {/* Show ID Text */}
            <div className="text-center text-sm text-gray-400">
              Room ID: <span className="font-mono text-yellow-400 font-bold text-lg">{id?.toString().slice(0,8)}...</span>
            </div>
            
            {/* Button Row */}
            <div className="flex gap-3">
              {/* Copy ID Button */}
              <button 
                onClick={() => handleCopy(id as string, 'ID Copied!')}
                className={`
                   flex-1 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base border border-white/5
                   ${copiedText === 'ID Copied!' 
                     ? 'bg-green-600 text-white' 
                     : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}
                `}
              >
                {copiedText === 'ID Copied!' ? '✅ Copied' : '📋 Copy ID'}
              </button>

              {/* Copy Link Button */}
              <button 
                onClick={() => handleCopy(window.location.href, 'Link Copied!')}
                className={`
                  flex-1 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base border border-white/10
                  ${copiedText === 'Link Copied!' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'}
                `}
              >
                {copiedText === 'Link Copied!' ? '✨ Copied!' : '🔗 Copy Link'}
              </button>
            </div>
            <p className="text-center text-xs text-gray-500 mt-1">Share the link or ID to invite a friend</p>
          </div>
        )}

        {/* Game Status Bar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`
            relative p-3 sm:p-4 rounded-2xl text-center shadow-2xl border overflow-hidden backdrop-blur-md mx-2 transition-colors duration-500
            ${game.status === 'WAITING' ? 'border-yellow-500/30 bg-yellow-900/10' : ''}
            ${game.status === 'IN_PROGRESS' && isMyTurn ? 'border-green-500/50 bg-green-900/20' : ''}
            ${game.status === 'IN_PROGRESS' && !isMyTurn ? 'border-red-500/30 bg-red-900/10' : ''}
            ${game.status === 'FINISHED' ? 'border-gray-500/50 bg-gray-800/60' : ''}
          `}
        >
          <div className="relative z-10 text-lg sm:text-xl font-bold">
            {game.status === 'WAITING' && (
              <div className="flex items-center justify-center gap-2 text-yellow-400 animate-pulse text-sm sm:text-base">
                <span>⏳</span> Waiting for opponent...
              </div>
            )}
            
            {game.status === 'IN_PROGRESS' && isSpectator && (
              <div className="text-purple-400 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base">
                 <span>👁️ Spectating:</span>
                 <span className={game.turn === game.player1.id ? 'text-blue-400' : 'text-red-400'}>
                    {game.turn === game.player1.id ? "Player 1 (X)" : "Player 2 (O)"}
                 </span> &apos;s Turn
              </div>
            )}

            {game.status === 'IN_PROGRESS' && !isSpectator && (
              isMyTurn ? (
                <div className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                  🚀 YOUR TURN!
                </div>
              ) : (
                <div className="text-red-400/80">
                  ⛔ Opponent is thinking...
                </div>
              )
            )}

            {game.status === 'FINISHED' && (
               <div className="text-2xl sm:text-3xl font-black drop-shadow-md">
                 {(() => {
                    const finalIndices = getWinningIndices(game.board);
                    const isDraw = game.board.includes('-') === false && finalIndices.length === 0;

                    if (isDraw) return <span className="text-gray-300">🤝 It&apos;s a Draw!</span>;

                    const winnerSymbol = game.board[finalIndices[0]];
                    
                    if (isSpectator) {
                        return <span className="text-yellow-400 text-xl sm:text-3xl">🏆 {winnerSymbol === 'X' ? "Player 1" : "Player 2"} Won!</span>;
                    }

                    const mySymbol = amIPlayer1 ? 'X' : 'O';
                    const iWon = winnerSymbol === mySymbol;

                    return iWon ? (
                        <span className="text-green-400 animate-bounce block">🎉 YOU WON! 🎉</span>
                    ) : (
                        <span className="text-red-500">💀 YOU LOST!</span>
                    );
                 })()}
               </div>
            )}
          </div>
        </motion.div>

        {/* Player Names */}
        <div className="flex justify-between px-4 sm:px-8">
          <motion.div 
            animate={{ scale: game.turn === game.player1.id ? 1.1 : 1, opacity: game.turn === game.player1.id ? 1 : 0.6 }}
            className="text-center w-1/2"
          >
            <div className="text-blue-400 font-bold text-base sm:text-lg drop-shadow-md">Player 1 (X)</div>
            <div className="text-xs sm:text-sm font-light text-gray-300 truncate">{game.player1.username} {amIPlayer1 && '(YOU)'}</div>
          </motion.div>
          
          <motion.div 
            animate={{ scale: game.turn === (game.player2?.id || '') ? 1.1 : 1, opacity: game.turn === (game.player2?.id || '') ? 1 : 0.6 }}
            className="text-center w-1/2"
          >
            <div className="text-red-400 font-bold text-base sm:text-lg drop-shadow-md">Player 2 (O)</div>
            <div className="text-xs sm:text-sm font-light text-gray-300 truncate">{game.player2?.username || '...'} {amIPlayer2 && '(YOU)'}</div>
          </motion.div>
        </div>

        {/* 🎮 THE BOARD (Responsive Grid) 🎮 */}
        <div className="relative px-2 sm:px-0">
          <div className={`grid grid-cols-3 gap-2 sm:gap-3 bg-gray-800/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-2xl border border-gray-700/50
            ${isReplayMode ? 'ring-4 ring-yellow-500/50' : ''}
          `}>
            {displayBoard.map((cell, index) => {
              const isWinningCell = winningIndices.includes(index);
              const isInteractable = !isReplayMode && !isSpectator && cell === '-' && isMyTurn && game.status === 'IN_PROGRESS';

              return (
                <motion.button
                  key={index}
                  whileHover={isInteractable ? { scale: 1.05, backgroundColor: 'rgba(55, 65, 81, 0.8)' } : {}}
                  whileTap={isInteractable ? { scale: 0.95 } : {}}
                  onClick={() => handleCellClick(index)}
                  disabled={!isInteractable}
                  className={`
                    aspect-square w-full rounded-xl flex items-center justify-center relative overflow-hidden
                    ${cell === '-' ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-gray-700/80'}
                    ${isWinningCell ? 'bg-green-900/50 ring-2 ring-green-400 z-10' : ''}
                    transition-all duration-200 border border-white/5
                  `}
                >
                  <AnimatePresence>
                    {cell === 'X' && (
                      <motion.span
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="text-5xl sm:text-7xl font-black text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                      >
                        X
                      </motion.span>
                    )}
                    {cell === 'O' && (
                      <motion.span
                        initial={{ scale: 0, rotate: 45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="text-5xl sm:text-7xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                      >
                        O
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* Replay Overlay Controls */}
          {game.status === 'FINISHED' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex justify-center w-full"
            >
              {!isReplayMode ? (
                <button
                  onClick={() => { setIsReplayMode(true); setReplayStep(0); }}
                  className="w-full sm:w-auto bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2 border border-white/10"
                >
                  🎬 Watch Replay
                </button>
              ) : (
                <div className="bg-gray-800 p-4 rounded-xl flex flex-col items-center gap-4 w-full border border-yellow-600/30 shadow-2xl">
                  <div className="text-yellow-400 font-bold uppercase tracking-widest text-xs">Replay Mode</div>
                  <div className="flex gap-4 items-center w-full justify-center">
                    <button onClick={() => setReplayStep(Math.max(0, replayStep - 1))} disabled={replayStep===0} className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">⏪</button>
                    <span className="font-mono text-xl w-16 text-center">{replayStep} / {game.moves?.length || 0}</span>
                    <button onClick={() => setReplayStep(Math.min(game.moves?.length || 0, replayStep + 1))} disabled={replayStep===(game.moves?.length||0)} className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">⏩</button>
                  </div>
                  <button onClick={() => setIsReplayMode(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-full backdrop-blur-md transition-all duration-300 group">Exit Replay</button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}