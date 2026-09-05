/**
 * Court Piece Scoring Engine
 * 
 * Rules Implementation:
 * 1. House Constraint: Team call must be between 5-8 (inclusive)
 * 2. Bidding Role: Team with higher cumulative bid = Declarer (Bidding Team)
 * 3. Declarer Scoring:
 *    - Win >= Called: Exact points of call (e.g., call 7, win 7+ = +7)
 *    - Over-tricks: Optional +0.1 per extra trick
 *    - Win < Called: Penalty = -exact team call (e.g., call 7, win 5 = -7)
 * 4. Cote/Slam Bonus: Declarer calls 8 AND wins 8/8 = +16 points
 * 5. Defender Scoring: +1 per trick won
 */

import {
  CPPlayer,
  CPRoundData,
  TeamId,
  RoundScoringResult,
  BidValidationResult,
  CPScoringConfig,
  getOpponentTeam,
  getTeamPlayers,
} from './court-piece-types';

/**
 * Validate a new bid against house constraints
 * Team total must be >= 5 and <= 8
 */
export const validateBid = (
  currentTeamACalls: number[],
  currentTeamBCalls: number[],
  newBid: number,
  bidderTeam: TeamId,
  config?: Partial<CPScoringConfig>
): BidValidationResult => {
  if (newBid < 5 || newBid > 8 || !Number.isInteger(newBid)) {
    return {
      isValid: false,
      error: 'Bid must be a whole number between 5 and 8',
    };
  }

  const teamACallIfAdded = bidderTeam === 'A' 
    ? currentTeamACalls.reduce((a, b) => a + b, 0) + newBid
    : currentTeamACalls.reduce((a, b) => a + b, 0);
    
  const teamBCallIfAdded = bidderTeam === 'B' 
    ? currentTeamBCalls.reduce((a, b) => a + b, 0) + newBid
    : currentTeamBCalls.reduce((a, b) => a + b, 0);

  // House constraint validation
  if (bidderTeam === 'A' && teamACallIfAdded > 8) {
    return {
      isValid: false,
      error: `Team A total would be ${teamACallIfAdded} (max 8)`,
      teamACallIfAdded,
      teamBCallIfAdded,
    };
  }

  if (bidderTeam === 'B' && teamBCallIfAdded > 8) {
    return {
      isValid: false,
      error: `Team B total would be ${teamBCallIfAdded} (max 8)`,
      teamACallIfAdded,
      teamBCallIfAdded,
    };
  }

  return {
    isValid: true,
    teamACallIfAdded,
    teamBCallIfAdded,
  };
};

/**
 * Calculate final scores for a round after settlement
 */
export const calculateRoundScores = (
  roundData: CPRoundData,
  config: CPScoringConfig = {
    allowFractionalOverTricks: false,
    defenderScoringMode: 'per-trick',
  }
): RoundScoringResult => {
  // Validate required data
  if (
    roundData.totalTeamACall === null ||
    roundData.totalTeamBCall === null ||
    roundData.teamATricksWon === null ||
    roundData.teamBTricksWon === null
  ) {
    throw new Error('Round data incomplete: missing call totals or tricks won');
  }

  // Determine declarer (team with higher cumulative bid)
  const declarerTeam: TeamId = roundData.totalTeamACall >= roundData.totalTeamBCall ? 'A' : 'B';
  const defenderTeam = declarerTeam === 'A' ? 'B' : 'A';

  const declarerCall = declarerTeam === 'A' ? roundData.totalTeamACall : roundData.totalTeamBCall;
  const declarerTricksWon = declarerTeam === 'A' ? roundData.teamATricksWon : roundData.teamBTricksWon;
  const defenderTricksWon = declarerTeam === 'A' ? roundData.teamBTricksWon : roundData.teamATricksWon;

  let declarerScore: number;
  let defenderScore: number;
  let reason: string;
  let isCoteBonus = false;

  // Calculate declarer score
  if (declarerTricksWon >= declarerCall) {
    // Base success
    declarerScore = declarerCall;

    // Over-tricks bonus
    if (config.allowFractionalOverTricks && declarerTricksWon > declarerCall) {
      const overTricks = declarerTricksWon - declarerCall;
      declarerScore += overTricks * 0.1;
    }

    // Cote / Slam bonus (8 call & 8 tricks won)
    if (declarerCall === 8 && declarerTricksWon === 8) {
      declarerScore = 16;
      isCoteBonus = true;
    }

    reason = `Declarer ${declarerTeam} won ${declarerTricksWon}/${declarerCall} tricks`;
  } else {
    // Bust: won fewer tricks than called
    declarerScore = -declarerCall;
    reason = `Declarer ${declarerTeam} busted: ${declarerTricksWon}/${declarerCall} tricks`;
  }

  // Calculate defender score
  if (config.defenderScoringMode === 'per-trick') {
    defenderScore = defenderTricksWon;
  } else {
    // 'absolute' mode: defenders also get points based on success
    defenderScore = defenderTricksWon;
  }

  // Assign scores based on declarer team
  const result: RoundScoringResult = {
    teamAScore: declarerTeam === 'A' ? declarerScore : defenderScore,
    teamBScore: declarerTeam === 'B' ? declarerScore : defenderScore,
    declarerTeam,
    reasons: {
      teamA: declarerTeam === 'A' ? reason : `Defender: ${defenderTricksWon} tricks`,
      teamB: declarerTeam === 'B' ? reason : `Defender: ${defenderTricksWon} tricks`,
    },
    isCoteBonus,
  };

  return result;
};

/**
 * Finalize bidding phase: calculate team totals and determine declarer
 */
export const finalizeBidding = (roundData: CPRoundData, players: CPPlayer[]): CPRoundData => {
  const teamAPlayers = getTeamPlayers(players, 'A');
  const teamBPlayers = getTeamPlayers(players, 'B');

  const teamATotal = teamAPlayers.reduce((sum, p) => sum + (roundData.bids[p.key] || 0), 0);
  const teamBTotal = teamBPlayers.reduce((sum, p) => sum + (roundData.bids[p.key] || 0), 0);

  // Validate house constraint
  if (teamATotal < 5 || teamATotal > 8 || teamBTotal < 5 || teamBTotal > 8) {
    throw new Error(
      `Invalid house total: Team A=${teamATotal}, Team B=${teamBTotal}. Both must be 5-8.`
    );
  }

  const declarerTeam: TeamId = teamATotal >= teamBTotal ? 'A' : 'B';

  return {
    ...roundData,
    phase: 'playing',
    totalTeamACall: teamATotal,
    totalTeamBCall: teamBTotal,
    declarerTeam,
    defenderTeam: getOpponentTeam(declarerTeam),
  };
};

/**
 * Finalize settlement and calculate scores
 */
export const finalizeSettlement = (
  roundData: CPRoundData,
  players: CPPlayer[],
  config?: Partial<CPScoringConfig>
): CPRoundData => {
  const teamAPlayers = getTeamPlayers(players, 'A');
  const teamBPlayers = getTeamPlayers(players, 'B');

  const teamATricksWon = teamAPlayers.reduce((sum, p) => sum + (roundData.tricksWon[p.key] || 0), 0);
  const teamBTricksWon = teamBPlayers.reduce((sum, p) => sum + (roundData.tricksWon[p.key] || 0), 0);

  if (teamATricksWon + teamBTricksWon !== 8) {
    throw new Error(
      `Trick count mismatch: Team A=${teamATricksWon}, Team B=${teamBTricksWon}. Total must be 8.`
    );
  }

  const scoringResult = calculateRoundScores(
    {
      ...roundData,
      teamATricksWon,
      teamBTricksWon,
    },
    config as CPScoringConfig
  );

  return {
    ...roundData,
    phase: 'settlement',
    teamATricksWon,
    teamBTricksWon,
    teamAScore: scoringResult.teamAScore,
    teamBScore: scoringResult.teamBScore,
  };
};

/**
 * Check if match should be completed
 */
export const checkMatchCompletion = (
  teamATotal: number,
  teamBTotal: number,
  pointsToWin: number = 52
): { isComplete: boolean; winner?: TeamId } => {
  const pointDifference = Math.abs(teamATotal - teamBTotal);
  if (teamATotal >= pointsToWin) {
    return { isComplete: true, winner: 'A' };
  }
  if (teamBTotal >= pointsToWin) {
    return { isComplete: true, winner: 'B' };
  }
  if (pointDifference >= pointsToWin) {
    return { isComplete: true, winner: teamATotal > teamBTotal ? 'A' : 'B' };
  }
  return { isComplete: false };
};

/**
 * Create next round from current round
 */
export const createNextRound = (
  currentRound: CPRoundData,
  players: CPPlayer[]
): CPRoundData => {
  const nextRoundNumber = currentRound.roundNumber + 1;
  const newRound: CPRoundData = {
    roundNumber: nextRoundNumber,
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
    newRound.bids[p.key] = null;
    newRound.tricksWon[p.key] = null;
  });

  return newRound;
};

/**
 * Format score display string with point differential
 */
export const formatScoreDifferential = (
  teamATotal: number,
  teamBTotal: number,
  pointsToWin: number = 52
): string => {
  const differential = Math.abs(teamATotal - teamBTotal);
  const leaderTeam = teamATotal > teamBTotal ? 'A' : teamBTotal > teamATotal ? 'B' : null;
  const pointsLeftToWin = pointsToWin - Math.max(teamATotal, teamBTotal);

  if (leaderTeam) {
    return `Team ${leaderTeam} leads by ${differential} pts — ${pointsLeftToWin} pts left to win`;
  }
  return `Teams tied — ${pointsToWin - teamATotal} pts to reach ${pointsToWin}`;
};
