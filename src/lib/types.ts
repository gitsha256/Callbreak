export type Player = 'Player1' | 'Player2' | 'Player3' | 'Player4';

export interface RoundData {
  bids: { [key in Player]: number | null };
  tricks: { [key in Player]: number | null };
  scores: { [key in Player]: number | null };
}

export interface GameState {
  players: Player[];
  rounds: RoundData[];
  startTime: Date | null;
}

export interface SavedGame {
  id: number;
  timestamp: Date;
  gameState: GameState;
}

const defaultPlayers: Player[] = ['Player1', 'Player2', 'Player3', 'Player4'];

const createInitialRounds = (): RoundData[] => {
  return Array(13).fill(null).map(() => ({
    bids: { Player1: null, Player2: null, Player3: null, Player4: null },
    tricks: { Player1: null, Player2: null, Player3: null, Player4: null },
    scores: { Player1: null, Player2: null, Player3: null, Player4: null },
  }));
};

export const initialGameState: GameState = {
  players: defaultPlayers,
  rounds: createInitialRounds(),
  startTime: null,
};
