
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Timer, Zap, RefreshCw, Trophy, Skull, Search, Info, Settings2 } from 'lucide-react';
import { GameStatus, WordInstance, Position, Difficulty } from './types';
import { fetchThemedWords } from './services/geminiService';
import { generateGrid } from './utils/puzzleGenerator';

const GRID_SIZE = 10;

const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: { time: 40, label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  [Difficulty.MEDIUM]: { time: 25, label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  [Difficulty.HARD]: { time: 15, label: 'Hard', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
};

const App: React.FC = () => {
  const [theme, setTheme] = useState('Space');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [grid, setGrid] = useState<string[][]>([]);
  const [words, setWords] = useState<WordInstance[]>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY_CONFIG[Difficulty.MEDIUM].time);
  const [selection, setSelection] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);

  const timerRef = useRef<number | null>(null);

  const startGame = useCallback(async () => {
    setIsLoading(true);
    setStatus(GameStatus.IDLE);
    setScore(0);
    const initialTime = DIFFICULTY_CONFIG[difficulty].time;
    setTimeLeft(initialTime);
    setSelection([]);

    const themedWords = await fetchThemedWords(theme);
    const { grid: newGrid, wordInstances } = generateGrid(themedWords, difficulty);
    
    setGrid(newGrid);
    setWords(wordInstances);
    setStatus(GameStatus.PLAYING);
    setIsLoading(false);
  }, [theme, difficulty]);

  useEffect(() => {
    if (status === GameStatus.PLAYING && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setStatus(GameStatus.LOST);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [status, timeLeft]);

  const handleMouseDown = (r: number, c: number) => {
    if (status !== GameStatus.PLAYING) return;
    setIsDragging(true);
    setSelection([{ r, c }]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isDragging || status !== GameStatus.PLAYING) return;
    
    const start = selection[0];
    const dr = r - start.r;
    const dc = c - start.c;
    
    const dist = Math.max(Math.abs(dr), Math.abs(dc));
    if (dist === 0) return;

    // Standard Word Search Rule: Selection must be a straight line (horiz, vert, or 45-deg diag)
    const isStraight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
    if (!isStraight) return;

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    const newSelection: Position[] = [];
    for (let i = 0; i <= dist; i++) {
      newSelection.push({
        r: start.r + i * stepR,
        c: start.c + i * stepC
      });
    }
    setSelection(newSelection);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    checkSelection();
  };

  const checkSelection = () => {
    const selectedWord = selection.map(p => grid[p.r][p.c]).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    const matchIndex = words.findIndex(w => 
      !w.found && (w.word === selectedWord || w.word === reversedWord)
    );

    if (matchIndex !== -1) {
      const updatedWords = [...words];
      updatedWords[matchIndex].found = true;
      setWords(updatedWords);
      
      // Points based on difficulty and time remaining
      const multiplier = difficulty === Difficulty.HARD ? 3 : difficulty === Difficulty.MEDIUM ? 2 : 1;
      setScore(prev => prev + (100 * multiplier) + timeLeft);
      
      // Reward small amount of time for finding a word
      const timeBonus = difficulty === Difficulty.HARD ? 2 : difficulty === Difficulty.MEDIUM ? 4 : 6;
      setTimeLeft(prev => Math.min(DIFFICULTY_CONFIG[difficulty].time, prev + timeBonus));

      if (updatedWords.every(w => w.found)) {
        setStatus(GameStatus.WON);
      }
    }
    setSelection([]);
  };

  const isCellSelected = (r: number, c: number) => 
    selection.some(p => p.r === r && p.c === c);

  const isCellFound = (r: number, c: number) => 
    words.some(w => w.found && w.positions.some(p => p.r === r && p.c === c));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white selection:bg-none">
      {/* Header Section */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400 fill-yellow-400" size={24} />
          <h1 className="text-2xl font-black tracking-tighter italic">GEMINI BLITZ</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Global Score</p>
          <p className="text-2xl font-mono text-emerald-400 font-bold leading-none">{score.toString().padStart(5, '0')}</p>
        </div>
      </div>

      {/* Main Game Card */}
      <div className="w-full max-w-md bg-slate-800 rounded-[2.5rem] p-6 shadow-2xl border border-slate-700 relative overflow-hidden">
        {/* Progress Bar Timer */}
        <div className="h-1.5 w-full bg-slate-900/50 absolute top-0 left-0">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${
              timeLeft < 5 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 
              timeLeft < 10 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${(timeLeft / DIFFICULTY_CONFIG[difficulty].time) * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6 mt-4">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700/50">
              <Timer size={18} className={timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-blue-400'} />
              <span className={`font-mono text-xl font-black ${timeLeft < 10 ? 'text-rose-500' : 'text-blue-400'}`}>
                {timeLeft}<span className="text-xs ml-0.5">s</span>
              </span>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-2xl border border-slate-700/50">
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={status === GameStatus.PLAYING}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    difficulty === d 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                placeholder="Enter puzzle theme..."
                disabled={status === GameStatus.PLAYING}
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            </div>
            <button 
              onClick={startGame}
              disabled={isLoading}
              className="p-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center min-w-[50px]"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} className="fill-current" />}
            </button>
          </div>
        </div>

        {/* Word Search Grid */}
        <div 
          className="grid grid-cols-10 gap-1 bg-slate-900 p-2.5 rounded-[2rem] touch-none select-none border border-slate-700/30"
          onMouseLeave={handleMouseUp}
        >
          {grid.length > 0 ? grid.map((row, r) => 
            row.map((char, c) => (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
                onMouseUp={handleMouseUp}
                className={`
                  aspect-square flex items-center justify-center text-sm md:text-base font-black rounded-lg cursor-pointer transition-all duration-100
                  grid-letter
                  ${isCellSelected(r, c) ? 'bg-blue-500 text-white scale-[1.15] z-10 shadow-xl' : ''}
                  ${isCellFound(r, c) ? 'bg-emerald-500/20 text-emerald-400' : ''}
                  ${!isCellSelected(r, c) && !isCellFound(r, c) ? 'hover:bg-slate-800 text-slate-500' : ''}
                `}
              >
                {char}
              </div>
            ))
          ) : (
            <div className="col-span-10 h-64 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
              <Settings2 size={40} className="mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Configure Blitz Settings</p>
              <p className="text-xs mt-2 opacity-30">Select difficulty and theme to begin</p>
            </div>
          )}
        </div>

        {/* Overlays */}
        {status === GameStatus.WON && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <Trophy size={40} className="text-white" />
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tighter">FLAWLESS!</h2>
            <p className="text-slate-400 mb-8 font-medium">Found all words on <span className={DIFFICULTY_CONFIG[difficulty].color}>{difficulty}</span> mode.</p>
            <button onClick={startGame} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black tracking-widest uppercase transition-all transform active:scale-95 shadow-xl">
              Next Blitz
            </button>
          </div>
        )}

        {status === GameStatus.LOST && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(244,63,94,0.4)]">
              <Skull size={40} className="text-white" />
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase">Defeated</h2>
            <p className="text-slate-400 mb-8 font-medium">The clock won this time. Speed matters.</p>
            <button onClick={startGame} className="w-full bg-slate-700 hover:bg-slate-600 py-4 rounded-2xl font-black tracking-widest uppercase transition-all shadow-xl">
              Replay Level
            </button>
          </div>
        )}
      </div>

      {/* Word List Section */}
      <div className="w-full max-w-md mt-8">
        <div className="flex justify-between items-end mb-4 px-2">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            Target List <div className="w-1 h-1 bg-slate-600 rounded-full"></div> {words.filter(w => w.found).length}/{words.length}
          </h3>
          <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${DIFFICULTY_CONFIG[difficulty].bg} ${DIFFICULTY_CONFIG[difficulty].color} ${DIFFICULTY_CONFIG[difficulty].border}`}>
            {DIFFICULTY_CONFIG[difficulty].label} Mode
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {words.map((w, idx) => (
            <div 
              key={idx}
              className={`px-4 py-3 rounded-2xl text-xs font-black transition-all border flex items-center justify-between ${
                w.found 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500/50 line-through' 
                : 'bg-slate-800/50 border-slate-700/50 text-slate-300'
              }`}
            >
              {w.word}
              {w.found && <Trophy size={12} className="opacity-50" />}
            </div>
          ))}
          {words.length === 0 && !isLoading && (
             <div className="col-span-2 text-center py-6 border-2 border-dashed border-slate-800 rounded-[2rem]">
               <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest">Awaiting Mission Intel</p>
             </div>
          )}
        </div>
      </div>

      <footer className="mt-auto py-8 text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <span>Rapid</span>
        <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
        <span>Search</span>
        <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
        <span>Protocol</span>
      </footer>
    </div>
  );
};

export default App;
