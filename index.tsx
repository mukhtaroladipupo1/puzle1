
import { Difficulty, GameStatus, Position, WordInstance } from './types';
import { fetchThemedWords } from './services/geminiService';
import { generateGrid } from './utils/puzzleGenerator';

// Constants
const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: { time: 40, label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  [Difficulty.MEDIUM]: { time: 25, label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  [Difficulty.HARD]: { time: 15, label: 'Hard', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
};

// State
let state = {
  theme: 'Space',
  difficulty: Difficulty.MEDIUM,
  grid: [] as string[][],
  words: [] as WordInstance[],
  status: GameStatus.IDLE,
  timeLeft: DIFFICULTY_CONFIG[Difficulty.MEDIUM].time,
  score: 0,
  selection: [] as Position[],
  isDragging: false,
  isLoading: false,
};

// DOM Cache
const dom = {
  score: document.getElementById('score-display'),
  timerBar: document.getElementById('timer-bar'),
  timerText: document.getElementById('timer-text'),
  themeInput: document.getElementById('theme-input') as HTMLInputElement,
  startBtn: document.getElementById('start-btn'),
  grid: document.getElementById('grid-container'),
  wordList: document.getElementById('word-list'),
  winOverlay: document.getElementById('win-overlay'),
  lostOverlay: document.getElementById('lost-overlay'),
  diffBadge: document.getElementById('difficulty-badge'),
  winMsg: document.getElementById('win-msg'),
  diffBtns: document.querySelectorAll('.diff-btn'),
  retryBtns: [document.getElementById('retry-win-btn'), document.getElementById('retry-lost-btn')],
  icons: {
    logo: document.getElementById('logo-icon'),
    timer: document.getElementById('timer-icon'),
    search: document.getElementById('search-icon'),
    btn: document.getElementById('btn-icon'),
    trophy: document.getElementById('trophy-icon'),
    skull: document.getElementById('skull-icon'),
  }
};

let timerInterval: number | null = null;

// Initial Setup
const init = () => {
  setupIcons();
  attachEventListeners();
  renderInitialState();
};

const setupIcons = async () => {
  const { Zap, Timer, Search, RefreshCw, Trophy, Skull } = await import('lucide-react');
  
  const iconMap: Record<string, any> = {
    logo: Zap,
    timer: Timer,
    search: Search,
    btn: Search,
    trophy: Trophy,
    skull: Skull
  };

  Object.entries(iconMap).forEach(([key, Icon]) => {
    const el = (dom.icons as any)[key];
    if (el) {
      el.innerHTML = '';
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const icon = new Icon({ size: key === 'trophy' || key === 'skull' ? 40 : (key === 'logo' ? 24 : 18) });
      el.appendChild(icon[0] || icon); // Handle lucide return types
      // Actually simpler to just use innerHTML with string literals if we had them, 
      // but lucide-react in ESM usually exports components. 
      // Let's use standard lucide-web approach for simplicity in vanilla.
      el.innerHTML = Icon.toString(); // Fallback if necessary
    }
  });

  // Re-fill specific icons manually for better reliability
  dom.icons.logo!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap text-yellow-400"><path d="M4 14.5a1 1 0 0 1-1-1 4 4 0 0 1 4-4h3a2 2 0 0 0 2-2V4a1 1 0 0 1 1.9-.45l7 10a1 1 0 0 1-.8 1.55h-3a2 2 0 0 0-2 2v3.5a1 1 0 0 1-1.9.45l-7-10Z"/></svg>`;
  dom.icons.timer!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
  dom.icons.search!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
  dom.icons.btn!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14.5a1 1 0 0 1-1-1 4 4 0 0 1 4-4h3a2 2 0 0 0 2-2V4a1 1 0 0 1 1.9-.45l7 10a1 1 0 0 1-.8 1.55h-3a2 2 0 0 0-2 2v3.5a1 1 0 0 1-1.9.45l-7-10Z"/></svg>`;
  dom.icons.trophy!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trophy"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
  dom.icons.skull!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-skull"><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1h6z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/></svg>`;
};

const attachEventListeners = () => {
  dom.startBtn!.addEventListener('click', startGame);
  dom.themeInput!.addEventListener('change', (e) => state.theme = (e.target as HTMLInputElement).value);
  
  dom.diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.status === GameStatus.PLAYING) return;
      const d = (btn as HTMLElement).dataset.difficulty as Difficulty;
      state.difficulty = d;
      state.timeLeft = DIFFICULTY_CONFIG[d].time;
      updateUI();
    });
  });

  dom.retryBtns.forEach(btn => btn!.addEventListener('click', startGame));

  // Global Grid events for drag selection
  window.addEventListener('mouseup', handleMouseUp);
};

const startGame = async () => {
  if (state.isLoading) return;
  
  state.isLoading = true;
  state.status = GameStatus.IDLE;
  state.score = 0;
  state.timeLeft = DIFFICULTY_CONFIG[state.difficulty].time;
  state.selection = [];
  
  updateUI();
  
  try {
    const themedWords = await fetchThemedWords(state.theme);
    const { grid, wordInstances } = generateGrid(themedWords, state.difficulty);
    
    state.grid = grid;
    state.words = wordInstances;
    state.status = GameStatus.PLAYING;
    state.isLoading = false;
    
    startTimer();
    updateUI();
  } catch (e) {
    state.isLoading = false;
    updateUI();
  }
};

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    if (state.status !== GameStatus.PLAYING) {
      clearInterval(timerInterval!);
      return;
    }
    
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.status = GameStatus.LOST;
      clearInterval(timerInterval!);
    }
    updateUI();
  }, 1000);
};

const handleMouseDown = (r: number, c: number) => {
  if (state.status !== GameStatus.PLAYING) return;
  state.isDragging = true;
  state.selection = [{ r, c }];
  updateGridCells();
};

const handleMouseEnter = (r: number, c: number) => {
  if (!state.isDragging || state.status !== GameStatus.PLAYING) return;
  
  const start = state.selection[0];
  const dr = r - start.r;
  const dc = c - start.c;
  const dist = Math.max(Math.abs(dr), Math.abs(dc));
  if (dist === 0) return;

  const isStraight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  if (!isStraight) return;

  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

  const newSelection: Position[] = [];
  for (let i = 0; i <= dist; i++) {
    newSelection.push({ r: start.r + i * stepR, c: start.c + i * stepC });
  }
  state.selection = newSelection;
  updateGridCells();
};

const handleMouseUp = () => {
  if (!state.isDragging) return;
  state.isDragging = false;
  checkSelection();
  updateGridCells();
};

const checkSelection = () => {
  const selectedWord = state.selection.map(p => state.grid[p.r][p.c]).join('');
  const reversedWord = selectedWord.split('').reverse().join('');

  const matchIndex = state.words.findIndex(w => 
    !w.found && (w.word === selectedWord || w.word === reversedWord)
  );

  if (matchIndex !== -1) {
    const word = state.words[matchIndex];
    word.found = true;
    
    const multiplier = state.difficulty === Difficulty.HARD ? 3 : state.difficulty === Difficulty.MEDIUM ? 2 : 1;
    state.score += (100 * multiplier) + state.timeLeft;
    
    const timeBonus = state.difficulty === Difficulty.HARD ? 2 : state.difficulty === Difficulty.MEDIUM ? 4 : 6;
    state.timeLeft = Math.min(DIFFICULTY_CONFIG[state.difficulty].time, state.timeLeft + timeBonus);

    if (state.words.every(w => w.found)) {
      state.status = GameStatus.WON;
    }
    updateUI();
  }
  state.selection = [];
};

// UI Renderers
const renderInitialState = () => {
  updateUI();
};

const updateUI = () => {
  // Overlays
  dom.winOverlay!.classList.toggle('hidden', state.status !== GameStatus.WON);
  dom.lostOverlay!.classList.toggle('hidden', state.status !== GameStatus.LOST);
  if (state.status === GameStatus.WON) {
    dom.winMsg!.textContent = `Found all words on ${state.difficulty} mode with ${state.timeLeft}s left!`;
  }

  // Score & Timer
  dom.score!.textContent = state.score.toString().padStart(5, '0');
  dom.timerText!.innerHTML = `${state.timeLeft}<span class="text-xs ml-0.5">s</span>`;
  const timePerc = (state.timeLeft / DIFFICULTY_CONFIG[state.difficulty].time) * 100;
  dom.timerBar!.style.width = `${timePerc}%`;
  
  const timerColor = state.timeLeft < 5 ? 'bg-rose-500' : state.timeLeft < 10 ? 'bg-amber-500' : 'bg-blue-500';
  dom.timerBar!.className = `h-full transition-all duration-1000 ease-linear ${timerColor}`;
  dom.timerText!.className = `font-mono text-xl font-black ${state.timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-blue-400'}`;

  // Difficulty UI
  dom.diffBtns.forEach(btn => {
    const d = (btn as HTMLElement).dataset.difficulty;
    const isActive = state.difficulty === d;
    btn.className = `diff-btn px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
      isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
    }`;
    (btn as HTMLButtonElement).disabled = state.status === GameStatus.PLAYING;
  });

  const dCfg = DIFFICULTY_CONFIG[state.difficulty];
  dom.diffBadge!.className = `text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${dCfg.bg} ${dCfg.color} ${dCfg.border}`;
  dom.diffBadge!.textContent = `${dCfg.label} Mode`;

  // Button state
  dom.startBtn!.classList.toggle('bg-slate-700', state.isLoading);
  dom.icons.btn!.classList.toggle('animate-spin', state.isLoading);
  dom.icons.btn!.innerHTML = state.isLoading 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14.5a1 1 0 0 1-1-1 4 4 0 0 1 4-4h3a2 2 0 0 0 2-2V4a1 1 0 0 1 1.9-.45l7 10a1 1 0 0 1-.8 1.55h-3a2 2 0 0 0-2 2v3.5a1 1 0 0 1-1.9.45l-7-10Z"/></svg>`;

  renderGrid();
  renderWordList();
};

const renderGrid = () => {
  if (state.grid.length === 0) return;
  
  // Re-rendering whole grid only when new game starts
  if (dom.grid!.children.length !== 100) {
    dom.grid!.innerHTML = '';
    state.grid.forEach((row, r) => {
      row.forEach((char, c) => {
        const cell = document.createElement('div');
        cell.className = 'aspect-square flex items-center justify-center text-sm md:text-base font-black rounded-lg cursor-pointer transition-all duration-100 grid-letter';
        cell.textContent = char;
        cell.dataset.r = r.toString();
        cell.dataset.c = c.toString();
        
        cell.addEventListener('mousedown', () => handleMouseDown(r, c));
        cell.addEventListener('mouseenter', () => handleMouseEnter(r, c));
        
        dom.grid!.appendChild(cell);
      });
    });
  }
  updateGridCells();
};

const updateGridCells = () => {
  const cells = dom.grid!.children;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i] as HTMLElement;
    const r = parseInt(cell.dataset.r!);
    const c = parseInt(cell.dataset.c!);
    
    const isSelected = state.selection.some(p => p.r === r && p.c === c);
    const isFound = state.words.some(w => w.found && w.positions.some(p => p.r === r && p.c === c));
    
    cell.className = `
      aspect-square flex items-center justify-center text-sm md:text-base font-black rounded-lg cursor-pointer transition-all duration-100 grid-letter
      ${isSelected ? 'bg-blue-500 text-white scale-[1.15] z-10 shadow-xl' : ''}
      ${isFound ? 'bg-emerald-500/20 text-emerald-400' : ''}
      ${!isSelected && !isFound ? 'hover:bg-slate-800 text-slate-500' : ''}
    `;
  }
};

const renderWordList = () => {
  if (state.words.length === 0 && !state.isLoading) {
    dom.wordList!.innerHTML = `
      <div class="col-span-2 text-center py-6 border-2 border-dashed border-slate-800 rounded-[2rem]">
        <p class="text-slate-700 text-[10px] font-black uppercase tracking-widest">Awaiting Mission Intel</p>
      </div>
    `;
    return;
  }

  dom.wordList!.innerHTML = state.words.map(w => `
    <div class="px-4 py-3 rounded-2xl text-xs font-black transition-all border flex items-center justify-between ${
      w.found 
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500/50 line-through' 
      : 'bg-slate-800/50 border-slate-700/50 text-slate-300'
    }">
      ${w.word}
      ${w.found ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>' : ''}
    </div>
  `).join('');
};

init();
