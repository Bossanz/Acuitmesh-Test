// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion'; 

export default function Lobby() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleCreateRoom = async () => {
    try {
      const res = await fetch('/api/games', { method: 'POST' });
      if (res.ok) {
        const { gameId } = await res.json();
        router.push(`/game/${gameId}`);
      }
    } catch (err) {
      alert('Failed to create room');
    }
  };

  const handleJoinRoom = () => {
    if (joinId) router.push(`/game/${joinId}`);
  };

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white animate-pulse">Loading Lobby...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]"></div>
      </div>

      {/* 🔥 Top Right Logout Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogout}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50 rounded-full backdrop-blur-md transition-all duration-300 group"
      >
        <span className="text-sm font-bold hidden sm:block">Logout</span>
        {/* SVG Logout Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md space-y-8 sm:space-y-10"
      >
        {/* Header & User Info (Clean Version) */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg tracking-tighter">
            TIC-TAC-TOE
          </h1>
          <div className="flex flex-col items-center">
             <p className="text-gray-400 tracking-[0.2em] text-xs sm:text-sm font-bold uppercase">Arena</p>
             {/* แสดงชื่อ User แบบเรียบหรู */}
             <div className="mt-4 flex items-center gap-2 text-gray-300 bg-white/5 px-4 py-1 rounded-full border border-white/10">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm">Welcome, <span className="text-white font-bold">{user?.username}</span></span>
             </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-5">
          {/* Create Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
            className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-white font-bold text-xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 group border border-blue-400/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-2xl font-light group-hover:rotate-90 transition-transform duration-300">＋</span> 
            <span>Create New Room</span>
          </motion.button>

          <div className="relative flex py-2 items-center opacity-60">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs tracking-widest">OR JOIN A FRIEND</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          {/* Join Input Group */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter Room ID..."
              className="w-full bg-gray-900/60 border border-gray-600 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500 transition text-center sm:text-left backdrop-blur-sm"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinRoom}
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 shadow-lg transition hover:border-green-500/50 hover:bg-green-500/20 hover:text-green-400"
            >
              Join
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}