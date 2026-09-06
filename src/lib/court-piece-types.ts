/**
 * Court Piece (CP) - 6-Player Team-Based Game Mode
 * 
 * Game Structure:
 * - 6 players divided into 2 fixed teams (Team A & Team B)
 * - Alternating seating: [TeamA, TeamB, TeamA, TeamB, TeamA, TeamB]
 * - Permanent trump suit: Spades
 * - Deck: 48 cards (remove all 2s, 8 cards per player)
 * - Match target: 52 points
 */

export type TeamId = 'A' | 'B';
export type GameMode = 'callbreak' | 'courtpiece';
export type GamePhase = 'setup' | 'bidding' | 'playing' | 'settlement' | 'completed';

/**
 * Player: Individual participant with team assignment
 */
export interface CPPlayer {
  key: string;
  name: string;
  team: TeamId;
  seatPosition: number; // 0-5 in alternating order
}

/**
 * Individual bid made by a player in bidding phase
 */
export interface PlayerBid {
  playerKey: string;
  bid: number;
}

/**
 * Settlement data: tricks won by each player in a round
 */
export interface PlayerSettlement {
  playerKey: string;
  tricksWon: number;
}

/**
 * CP Round: Contains bids, tricks won, and calculated scores
 */
export interface CPRoundData {
  roundNumber: number;
  phase: GamePhase;
  
  // Bidding phase data
  bids: { [playerKey: string]: number | null }; // Individual player bids
  teamACalls: number[]; // Array of individual bids from Team A players
  teamBCalls: number[]; // Array of individual bids from Team B players
  totalTeamACall: number | null; // Sum of Team A bids
  totalTeamBCall: number | null; // Sum of Team B bids
  
  // Team role assignment
  declarerTeam: TeamId | null; // Team with higher cumulative bid
  defenderTeam: TeamId | null; // Other team
  
  // Settlement phase data
  tricksWon: { [playerKey: string]: number | null }; // Tricks won by each player
  teamATricksWon: number | null; // Total tricks won by Team A
  teamBTricksWon: number | null; // Total tricks won by Team B
  
  // Scoring results
  teamAScore: number | null; // Final score for Team A this round
  teamBScore: number | null; // Final score for Team B this round
  
  // Metadata
  timestamp: Date;
}

/**
 * Match Totals: Cumulative scores across all rounds
 */
export interface MatchTotals {
  teamATotal: number;
  teamBTotal: number;
  pointsToWin: number; // 52
  leaderTeam: TeamId | null;
  pointDifferential: number; // Absolute difference
  matchWinner: TeamId | null; // null if ongoing
}

/**
 * Court Piece Game State
 */
export interface CPGameState {
  players: CPPlayer[];
  teamNames: Record<TeamId, string>;
  rounds: CPRoundData[];
  matchTotals: MatchTotals;
  currentPhase: GamePhase;
  currentRoundIndex: number;
  startTime: Date | null;
  endTime: Date | null;
  deckConfiguration: 'deck48'; // Extensible for future deck options
}

/**
 * Scoring Configuration: Toggle options for rule variations
 */
export interface CPScoringConfig {
  allowFractionalOverTricks: boolean; // +0.1 per extra trick when enabled
  defenderScoringMode: 'per-trick' | 'absolute'; // How defenders score
}

/**
 * Bid Validation Result
 */
export interface BidValidationResult {
  isValid: boolean;
  error?: string; // e.g., "Team total would exceed 8"
  warning?: string;
  teamACallIfAdded?: number;
  teamBCallIfAdded?: number;
}

/**
 * Round Scoring Result: Output of scoring calculation
 */
export interface RoundScoringResult {
  teamAScore: number;
  teamBScore: number;
  declarerTeam: TeamId;
  reasons: {
    teamA: string;
    teamB: string;
  };
  isCoteBonus: boolean; // True if Declarer called 8 and won all 8
}

/**
 * Helper: Create initial Court Piece game state
 */
export const createCPGameState = (playerNames: string[]): CPGameState => {
  if (playerNames.length !== 6) {
    throw new Error('Court Piece requires exactly 6 players');
  }

  const players: CPPlayer[] = playerNames.map((name, index) => ({
    key: `cp_player${index}`,
    name,
    team: index % 2 === 0 ? 'A' : 'B',
    seatPosition: index,
  }));

  const initialRound: CPRoundData = {
    roundNumber: 1,
    phase: 'bidding',
    bids: {},
    teamACalls: [],
    teamBCalls: [],
    totalTeamACall: null,
    totalTeamBCall: null,
    declarerTeam: null,
    defenderTeam: null,
    tricksWon: {},
    teamATricksWon: null,
    teamBTricksWon: null,
    teamAScore: null,
    teamBScore: null,
    timestamp: new Date(),
  };

  players.forEach(p => {
    initialRound.bids[p.key] = null;
    initialRound.tricksWon[p.key] = null;
  });

  const rounds = Array.from({ length: 15 }, (_, index) => ({
    ...initialRound,
    roundNumber: index + 1,
    bids: { ...initialRound.bids },
    tricksWon: { ...initialRound.tricksWon },
    timestamp: new Date(),
  }));

  return {
    players,
    teamNames: { A: 'Team A', B: 'Team B' },
    rounds,
    matchTotals: {
      teamATotal: 0,
      teamBTotal: 0,
      pointsToWin: 52,
      leaderTeam: null,
      pointDifferential: 0,
      matchWinner: null,
    },
    currentPhase: 'bidding',
    currentRoundIndex: 0,
    startTime: new Date(),
    endTime: null,
    deckConfiguration: 'deck48',
  };
};

/**
 * Helper: Get players by team
 */
export const getTeamPlayers = (players: CPPlayer[], team: TeamId): CPPlayer[] => {
  return players.filter(p => p.team === team);
};

/**
 * Helper: Get opponent team
 */
export const getOpponentTeam = (team: TeamId): TeamId => {
  return team === 'A' ? 'B' : 'A';
};
