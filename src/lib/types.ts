export interface Player {
  key: string;
  name: string;
}

export interface RoundData {
  bids: { [key: string]: number | null };
  tricks: { [key: string]: number | null };
  scores: { [key: string]: number | null };
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

const defaultPlayerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

const createInitialPlayers = (names: string[]): Player[] => {
    return names.map((name, index) => ({ key: `player${index+1}`, name }));
}

const createInitialRounds = (players: Player[]): RoundData[] => {
  return Array(13).fill(null).map(() => {
    const roundData: RoundData = {
        bids: {},
        tricks: {},
        scores: {}
    };
    players.forEach(p => {
        roundData.bids[p.key] = null;
        roundData.tricks[p.key] = null;
        roundData.scores[p.key] = null;
    })
    return roundData;
  });
};

export const initialGameState = (playerNames: string[] = defaultPlayerNames): GameState => {
    const players = createInitialPlayers(playerNames);
    const rounds = createInitialRounds(players);
    return {
        players,
        rounds,
        startTime: null,
    };
};
