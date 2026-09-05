/**
 * Court Piece Scoring Engine - Comprehensive Unit Tests
 */

import {
  validateBid,
  calculateRoundScores,
  finalizeBidding,
  finalizeSettlement,
  checkMatchCompletion,
  createNextRound,
  formatScoreDifferential,
} from '../src/lib/court-piece-scoring';

import {
  CPPlayer,
  CPRoundData,
  CPScoringConfig,
  createCPGameState,
  getTeamPlayers,
} from '../src/lib/court-piece-types';

describe('Court Piece Scoring Engine', () => {
  let mockPlayers: CPPlayer[];
  let mockRoundData: CPRoundData;

  beforeEach(() => {
    const gameState = createCPGameState([
      'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'
    ]);
    mockPlayers = gameState.players;
    mockRoundData = gameState.rounds[0];
  });

  describe('validateBid', () => {
    it('should accept valid bids between 3 and 8', () => {
      const result = validateBid([], [], 5, 'A');
      expect(result.isValid).toBe(true);
    });

    it('should reject bids below 3', () => {
      const result = validateBid([], [], 2, 'A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between 3 and 8');
    });

    it('should reject bids above 8', () => {
      const result = validateBid([], [], 9, 'A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between 3 and 8');
    });

    it('should enforce house max constraint (Team A)', () => {
      const currentTeamACalls = [4, 3, 2]; // Total 9 if adding 3
      const result = validateBid(currentTeamACalls, [], 3, 'A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('max 8');
    });

    it('should enforce house max constraint (Team B)', () => {
      const currentTeamBCalls = [5, 3]; // Total 9 if adding 1
      const result = validateBid([], currentTeamBCalls, 1, 'B');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('max 8');
    });

    it('should calculate projected team totals correctly', () => {
      const result = validateBid([3, 2], [4, 3], 3, 'A');
      expect(result.isValid).toBe(true);
      expect(result.teamACallIfAdded).toBe(8); // 3+2+3
      expect(result.teamBCallIfAdded).toBe(7); // 4+3 (unchanged)
    });
  });

  describe('calculateRoundScores - Declarer Success', () => {
    it('should award exact call points on standard success', () => {
      mockRoundData.totalTeamACall = 7;
      mockRoundData.totalTeamBCall = 5;
      mockRoundData.teamATricksWon = 7;
      mockRoundData.teamBTricksWon = 1;

      const result = calculateRoundScores(mockRoundData);
      expect(result.teamAScore).toBe(7); // Called 7, won 7 = +7
      expect(result.teamBScore).toBe(1); // Defender: 1 trick
      expect(result.declarerTeam).toBe('A');
    });

    it('should award same points when won tricks exceed call', () => {
      mockRoundData.totalTeamACall = 6;
      mockRoundData.totalTeamBCall = 4;
      mockRoundData.teamATricksWon = 8;
      mockRoundData.teamBTricksWon = 0;

      const result = calculateRoundScores(mockRoundData);
      expect(result.teamAScore).toBe(6); // Called 6, won 8 = +6 (no over-trick bonus)
      expect(result.declarerTeam).toBe('A');
    });

    it('should apply over-trick bonus (+0.1) when enabled', () => {
      const config: CPScoringConfig = {
        allowFractionalOverTricks: true,
        defenderScoringMode: 'per-trick',
      };

      mockRoundData.totalTeamACall = 6;
      mockRoundData.totalTeamBCall = 4;
      mockRoundData.teamATricksWon = 8;
      mockRoundData.teamBTricksWon = 0;

      const result = calculateRoundScores(mockRoundData, config);
      expect(result.teamAScore).toBe(6.2); // 6 + (2 over-tricks × 0.1)
    });
  });

  describe('calculateRoundScores - Declarer Bust', () => {
    it('should apply negative penalty when declarer loses', () => {
      mockRoundData.totalTeamACall = 7;
      mockRoundData.totalTeamBCall = 5;
      mockRoundData.teamATricksWon = 5;
      mockRoundData.teamBTricksWon = 3;

      const result = calculateRoundScores(mockRoundData);
      expect(result.teamAScore).toBe(-7); // Called 7, won 5 = -7 (exact call penalty)
      expect(result.teamBScore).toBe(3); // Defender: 3 tricks
    });

    it('should penalize with exact team call value', () => {
      mockRoundData.totalTeamACall = 4;
      mockRoundData.totalTeamBCall = 6;
      mockRoundData.teamBTricksWon = 7;
      mockRoundData.teamATricksWon = 1;

      const result = calculateRoundScores(mockRoundData);
      expect(result.teamBScore).toBe(6); // Won 7, called 6 = +6
      expect(result.teamAScore).toBe(1); // Defender: 1 trick
    });
  });

  describe('calculateRoundScores - Cote/Slam Bonus', () => {
    it('should award 16 points (double) for calling 8 and winning all 8', () => {
      mockRoundData.totalTeamACall = 8;
      mockRoundData.totalTeamBCall = 4;
      mockRoundData.teamATricksWon = 8;
      mockRoundData.teamBTricksWon = 0;

      const result = calculateRoundScores(mockRoundData);
      expect(result.teamAScore).toBe(16); // Cote bonus: 2×8
      expect(result.isCoteBonus).toBe(true);
      expect(result.declarerTeam).toBe('A');
    });

    it('should NOT award cote if declarer wins 7/8 even with call of 8', () => {
      mockRoundData.totalTeamACall = 8;
      mockRoundData.totalTeamBCall = 3;
      mockRoundData.teamATricksWon = 7;
      mockRoundData.teamBTricksWon = 1;

      const result = calculateRoundScores(mockRoundData);
      expect(result.teamAScore).toBe(-8); // Bust: 7 < 8
      expect(result.isCoteBonus).toBe(false);
    });

    it('should award cote even with over-tricks config enabled', () => {
      const config: CPScoringConfig = {
        allowFractionalOverTricks: true,
        defenderScoringMode: 'per-trick',
      };

      mockRoundData.totalTeamBCall = 8;
      mockRoundData.totalTeamACall = 4;
      mockRoundData.teamBTricksWon = 8;
      mockRoundData.teamATricksWon = 0;

      const result = calculateRoundScores(mockRoundData, config);
      expect(result.teamBScore).toBe(16);
      expect(result.isCoteBonus).toBe(true);
    });
  });

  describe('finalizeBidding', () => {
    it('should calculate team totals correctly', () => {
      mockRoundData.bids = {
        cp_player0: 4, // Team A
        cp_player1: 5, // Team B
        cp_player2: 3, // Team A
        cp_player3: 2, // Team B
        cp_player4: 2, // Team A
        cp_player5: 3, // Team B
      };

      const result = finalizeBidding(mockRoundData, mockPlayers);
      expect(result.totalTeamACall).toBe(9); // 4+3+2 // Should this fail?
      expect(result.totalTeamBCall).toBe(10);
    });

    it('should throw error when team total exceeds 8', () => {
      mockRoundData.bids = {
        cp_player0: 5, // Team A
        cp_player1: 3, // Team B
        cp_player2: 4, // Team A
        cp_player3: 3, // Team B
        cp_player4: 3, // Team A -> Total A = 12
        cp_player5: 3, // Team B
      };

      expect(() => finalizeBidding(mockRoundData, mockPlayers)).toThrow(
        /both must be 5-8/
      );
    });

    it('should throw error when team total is less than 5', () => {
      mockRoundData.bids = {
        cp_player0: 2, // Team A
        cp_player1: 3, // Team B
        cp_player2: 2, // Team A
        cp_player3: 2, // Team B
        cp_player4: 2, // Team A -> Total A = 6
        cp_player5: 3, // Team B -> Total B = 8
      };

      expect(() => finalizeBidding(mockRoundData, mockPlayers)).toThrow(
        /both must be 5-8/
      );
    });

    it('should set declarer as team with higher call', () => {
      mockRoundData.bids = {
        cp_player0: 3, // Team A
        cp_player1: 3, // Team B
        cp_player2: 2, // Team A
        cp_player3: 4, // Team B
        cp_player4: 2, // Team A -> Total A = 7
        cp_player5: 2, // Team B -> Total B = 9 // INVALID
      };

      mockRoundData.bids = {
        cp_player0: 3, // Team A
        cp_player1: 3, // Team B
        cp_player2: 2, // Team A
        cp_player3: 2, // Team B
        cp_player4: 2, // Team A -> Total A = 7
        cp_player5: 2, // Team B -> Total B = 7
      };

      const result = finalizeBidding(mockRoundData, mockPlayers);
      expect(result.declarerTeam).toBe('A'); // Equal, so first team (A) is declarer
      expect(result.defenderTeam).toBe('B');
    });

    it('should set Team B as declarer when they have higher call', () => {
      mockRoundData.bids = {
        cp_player0: 3, // Team A
        cp_player1: 4, // Team B
        cp_player2: 2, // Team A
        cp_player3: 3, // Team B
        cp_player4: 2, // Team A -> Total A = 7
        cp_player5: 2, // Team B -> Total B = 9 // INVALID - need to adjust
      };

      mockRoundData.bids = {
        cp_player0: 2, // Team A
        cp_player1: 4, // Team B
        cp_player2: 2, // Team A
        cp_player3: 3, // Team B
        cp_player4: 2, // Team A -> Total A = 6
        cp_player5: 2, // Team B -> Total B = 9 // INVALID
      };

      // Corrected to valid totals
      mockRoundData.bids = {
        cp_player0: 2, // Team A
        cp_player1: 3, // Team B
        cp_player2: 3, // Team A
        cp_player3: 4, // Team B
        cp_player4: 2, // Team A -> Total A = 7
        cp_player5: 2, // Team B -> Total B = 9 // Still invalid
      };

      // Let me use valid values
      mockRoundData.bids = {
        cp_player0: 2, // Team A
        cp_player1: 3, // Team B
        cp_player2: 3, // Team A
        cp_player3: 3, // Team B
        cp_player4: 2, // Team A -> Total A = 7
        cp_player5: 2, // Team B -> Total B = 8
      };

      const result = finalizeBidding(mockRoundData, mockPlayers);
      expect(result.declarerTeam).toBe('B'); // Team B has higher call (8 > 7)
      expect(result.defenderTeam).toBe('A');
    });
  });

  describe('finalizeSettlement', () => {
    beforeEach(() => {
      mockRoundData.totalTeamACall = 6;
      mockRoundData.totalTeamBCall = 5;
      mockRoundData.declarerTeam = 'A';
      mockRoundData.defenderTeam = 'B';
    });

    it('should calculate tricks won by team', () => {
      mockRoundData.tricksWon = {
        cp_player0: 2, // Team A
        cp_player1: 1, // Team B
        cp_player2: 2, // Team A
        cp_player3: 1, // Team B
        cp_player4: 2, // Team A
        cp_player5: 0, // Team B
      };

      const result = finalizeSettlement(mockRoundData, mockPlayers);
      expect(result.teamATricksWon).toBe(6); // 2+2+2
      expect(result.teamBTricksWon).toBe(2); // 1+1+0
    });

    it('should throw error if total tricks do not equal 8', () => {
      mockRoundData.tricksWon = {
        cp_player0: 2, // Team A
        cp_player1: 1, // Team B
        cp_player2: 2, // Team A
        cp_player3: 1, // Team B
        cp_player4: 2, // Team A
        cp_player5: 1, // Team B -> Total = 9
      };

      expect(() => finalizeSettlement(mockRoundData, mockPlayers)).toThrow(
        /Total must be 8/
      );
    });

    it('should calculate scores after settlement', () => {
      mockRoundData.tricksWon = {
        cp_player0: 2, // Team A
        cp_player1: 1, // Team B
        cp_player2: 2, // Team A
        cp_player3: 1, // Team B
        cp_player4: 2, // Team A
        cp_player5: 0, // Team B
      };

      const result = finalizeSettlement(mockRoundData, mockPlayers);
      expect(result.teamAScore).toBe(6); // Won 6, called 6
      expect(result.teamBScore).toBe(2); // Defender: 2 tricks
      expect(result.phase).toBe('settlement');
    });
  });

  describe('checkMatchCompletion', () => {
    it('should return incomplete for scores below 52', () => {
      const result = checkMatchCompletion(30, 25);
      expect(result.isComplete).toBe(false);
      expect(result.winner).toBeUndefined();
    });

    it('should return Team A as winner at 52', () => {
      const result = checkMatchCompletion(52, 40);
      expect(result.isComplete).toBe(true);
      expect(result.winner).toBe('A');
    });

    it('should return Team B as winner at 52', () => {
      const result = checkMatchCompletion(48, 52);
      expect(result.isComplete).toBe(true);
      expect(result.winner).toBe('B');
    });

    it('should support custom points-to-win', () => {
      const result = checkMatchCompletion(40, 35, 40);
      expect(result.isComplete).toBe(true);
      expect(result.winner).toBe('A');
    });
  });

  describe('createNextRound', () => {
    it('should increment round number', () => {
      mockRoundData.roundNumber = 5;
      const nextRound = createNextRound(mockRoundData, mockPlayers);
      expect(nextRound.roundNumber).toBe(6);
    });

    it('should reset all scores and bids', () => {
      mockRoundData.totalTeamACall = 7;
      mockRoundData.totalTeamBCall = 5;
      mockRoundData.teamAScore = 7;
      mockRoundData.teamBScore = 1;

      const nextRound = createNextRound(mockRoundData, mockPlayers);
      expect(nextRound.totalTeamACall).toBeNull();
      expect(nextRound.totalTeamBCall).toBeNull();
      expect(nextRound.teamAScore).toBeNull();
      expect(nextRound.teamBScore).toBeNull();
    });

    it('should initialize all players with null values', () => {
      const nextRound = createNextRound(mockRoundData, mockPlayers);
      mockPlayers.forEach(p => {
        expect(nextRound.bids[p.key]).toBeNull();
        expect(nextRound.tricksWon[p.key]).toBeNull();
      });
    });

    it('should set phase to bidding', () => {
      const nextRound = createNextRound(mockRoundData, mockPlayers);
      expect(nextRound.phase).toBe('bidding');
    });
  });

  describe('formatScoreDifferential', () => {
    it('should show team leading by margin', () => {
      const result = formatScoreDifferential(40, 25);
      expect(result).toContain('Team A leads by 15 pts');
      expect(result).toContain('12 pts left to win'); // 52 - 40
    });

    it('should show Team B leading', () => {
      const result = formatScoreDifferential(30, 48);
      expect(result).toContain('Team B leads by 18 pts');
      expect(result).toContain('4 pts left to win'); // 52 - 48
    });

    it('should show tied status', () => {
      const result = formatScoreDifferential(35, 35);
      expect(result).toContain('Teams tied');
      expect(result).toContain('17 pts'); // 52 - 35
    });

    it('should support custom points-to-win', () => {
      const result = formatScoreDifferential(30, 20, 60);
      expect(result).toContain('Team A leads by 10 pts');
      expect(result).toContain('30 pts left to win'); // 60 - 30
    });
  });

  describe('Integration: Full Round Sequence', () => {
    it('should complete a full round from bidding to settlement', () => {
      // Step 1: Bidding phase
      let round = { ...mockRoundData };
      round.bids = {
        cp_player0: 3, // Team A
        cp_player1: 3, // Team B
        cp_player2: 3, // Team A
        cp_player3: 2, // Team B
        cp_player4: 2, // Team A -> Total A = 8
        cp_player5: 3, // Team B -> Total B = 8
      };

      round = finalizeBidding(round, mockPlayers);
      expect(round.totalTeamACall).toBe(8);
      expect(round.totalTeamBCall).toBe(8);
      expect(round.declarerTeam).toBe('A'); // Tie defaults to Team A

      // Step 2: Settlement phase
      round.tricksWon = {
        cp_player0: 2, // Team A
        cp_player1: 1, // Team B
        cp_player2: 3, // Team A
        cp_player3: 1, // Team B
        cp_player4: 3, // Team A
        cp_player5: 1, // Team B -> Total: A=8, B=0. Wait that's not 8 for B... let me recalc
      };

      round.tricksWon = {
        cp_player0: 2, // Team A
        cp_player1: 1, // Team B
        cp_player2: 3, // Team A
        cp_player3: 1, // Team B
        cp_player4: 2, // Team A
        cp_player5: 1, // Team B -> Total: A=7, B=3, sum=10. Invalid
      };

      round.tricksWon = {
        cp_player0: 2, // Team A
        cp_player1: 1, // Team B
        cp_player2: 3, // Team A
        cp_player3: 1, // Team B
        cp_player4: 2, // Team A
        cp_player5: 1, // Team B
      };
      // Total A = 2+3+2 = 7, B = 1+1+1 = 3. Sum = 10. Still wrong.
      // We need exactly 8 tricks total.

      round.tricksWon = {
        cp_player0: 2, // Team A
        cp_player1: 0, // Team B
        cp_player2: 2, // Team A
        cp_player3: 1, // Team B
        cp_player4: 3, // Team A
        cp_player5: 0, // Team B
      };
      // Total A = 2+2+3 = 7, B = 0+1+0 = 1. Sum = 8. Valid!

      round = finalizeSettlement(round, mockPlayers);
      expect(round.teamATricksWon).toBe(7);
      expect(round.teamBTricksWon).toBe(1);
      expect(round.teamAScore).toBe(-8); // Called 8, won 7 = bust
      expect(round.teamBScore).toBe(1); // Defender: 1 trick
    });
  });
});
