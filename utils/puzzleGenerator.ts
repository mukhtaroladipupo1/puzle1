
import { Position, WordInstance, Difficulty } from '../types';

const GRID_SIZE = 10;

const GET_DIRECTIONS = (difficulty: Difficulty) => {
  const horizontal = { r: 0, c: 1 };
  const vertical = { r: 1, c: 0 };
  const diagDownRight = { r: 1, c: 1 };
  const horizontalBack = { r: 0, c: -1 };
  const verticalUp = { r: -1, c: 0 };
  const diagUpRight = { r: -1, c: 1 };
  const diagDownLeft = { r: 1, c: -1 };
  const diagUpLeft = { r: -1, c: -1 };

  switch (difficulty) {
    case Difficulty.EASY:
      return [horizontal, vertical];
    case Difficulty.MEDIUM:
      return [horizontal, vertical, diagDownRight];
    case Difficulty.HARD:
      return [
        horizontal, vertical, diagDownRight, 
        horizontalBack, verticalUp, diagUpRight, 
        diagDownLeft, diagUpLeft
      ];
    default:
      return [horizontal, vertical];
  }
};

export const generateGrid = (words: string[], difficulty: Difficulty) => {
  const grid: string[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
  const wordInstances: WordInstance[] = [];
  const directions = GET_DIRECTIONS(difficulty);

  for (const word of words) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 150) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startR = Math.floor(Math.random() * GRID_SIZE);
      const startC = Math.floor(Math.random() * GRID_SIZE);

      if (canPlace(grid, word, startR, startC, dir)) {
        const positions: Position[] = [];
        for (let i = 0; i < word.length; i++) {
          const r = startR + i * dir.r;
          const c = startC + i * dir.c;
          grid[r][c] = word[i];
          positions.push({ r, c });
        }
        wordInstances.push({ word, found: false, positions });
        placed = true;
      }
      attempts++;
    }
  }

  // Fill empty spaces with random letters
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  return { grid, wordInstances };
};

const canPlace = (grid: string[][], word: string, r: number, c: number, dir: { r: number, c: number }) => {
  // Check bounds for entire word length
  const endR = r + (word.length - 1) * dir.r;
  const endC = c + (word.length - 1) * dir.c;

  if (endR >= GRID_SIZE || endR < 0 || endC >= GRID_SIZE || endC < 0) return false;

  for (let i = 0; i < word.length; i++) {
    const currR = r + i * dir.r;
    const currC = c + i * dir.c;
    if (grid[currR][currC] !== '' && grid[currR][currC] !== word[i]) return false;
  }

  return true;
};
