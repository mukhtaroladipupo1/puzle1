
export interface Position {
  r: number;
  c: number;
}

export interface WordInstance {
  word: string;
  found: boolean;
  positions: Position[];
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface GameState {
  grid: string[][];
  words: WordInstance[];
  status: 'IDLE' | 'PLAYING' | 'WON' | 'LOST';
  timer: number;
  theme: string;
  difficulty: Difficulty;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST'
}
