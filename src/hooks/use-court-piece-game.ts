/**
 * Court Piece Game State Hook
 * Manages game state, phase transitions, and scoring
 */

'use client';

import { useState, useCallback, useReducer, useEffect } from 'react';
import {
  CPGameState,
  CPPlayer,
  CPRoundData,
  CPScoringConfig,
  MatchTotals,
  TeamId,
  createCPGameState,
  getTeamPlayers,
  getOpponentTeam,
} from '@/lib/court-piece-types';
import {
  validateBid,
  finalizeBidding,
  finalizeSettlement,
  checkMatchCompletion,
  createNextRound,
} from '@/lib/court-piece-scoring';

export type GameAction =
  | { type: 'INITIALIZE'; payload: string[] } // Player names
  | { type: 'LOAD_GAME_STATE'; payload: CPGameState }
  | { type: 'UPDATE_ROUND_ENTRY'; payload: { roundIndex: number; team: TeamId; value: number | null } }
  | { type: 'PLACE_BID'; payload: { playerKey: string; bid: number } }
  | { type: 'FINALIZE_BIDDING' }
  | { type: 'RECORD_TRICK'; payload: { playerKey: string; tricksWon: number } }
  | { type: 'FINALIZE_SETTLEMENT' }
  | { type: 'START_NEXT_ROUND' }
  | { type: 'UPDATE_SCORING_CONFIG'; payload: Partial<CPScoringConfig> }
  | { type: 'UPDATE_TEAM_NAME'; payload: { team: TeamId; name: string } }
  | { type: 'RESET_GAME' };

/**
 * Court Piece Game State Reducer
 */
const cpGameReducer = (state: CPGameState, action: GameAction): CPGameState => {
  switch (action.type) {
    case 'INITIALIZE': {
      return createCPGameState(action.payload);
    }

    case 'LOAD_GAME_STATE': {
      return action.payload;
    }

    case 'UPDATE_ROUND_ENTRY': {
      const { roundIndex, team, value } = action.payload;
      if (value !== null && !Number.isInteger(value)) return state;

      const updatedRounds = state.rounds.map((round, index) => {
        if (index !== roundIndex) return round;

        return {
          ...round,
          totalTeamACall: team === 'A' ? value : round.totalTeamACall,
          totalTeamBCall: team === 'B' ? value : round.totalTeamBCall,
          teamAScore: team === 'A' ? value : round.teamAScore,
          teamBScore: team === 'B' ? value : round.teamBScore,
        };
      });

      const editedRound = updatedRounds[roundIndex];
      const hasEntry = editedRound.teamAScore !== null || editedRound.teamBScore !== null;
      const hasBlankNextRound = updatedRounds.some(round =>
        round.totalTeamACall === null && round.totalTeamBCall === null
      );

      if (hasEntry && !hasBlankNextRound) {
        updatedRounds.push(createNextRound(editedRound, state.players));
      }

      const teamATotal = updatedRounds.reduce((sum, round) => sum + (round.teamAScore ?? 0), 0);
      const teamBTotal = updatedRounds.reduce((sum, round) => sum + (round.teamBScore ?? 0), 0);

      return {
        ...state,
        rounds: updatedRounds,
        matchTotals: {
          ...state.matchTotals,
          teamATotal,
          teamBTotal,
          leaderTeam: teamATotal > teamBTotal ? 'A' : teamBTotal > teamATotal ? 'B' : null,
          pointDifferential: Math.abs(teamATotal - teamBTotal),
        },
      };
    }

    case 'PLACE_BID': {
      const currentRound = state.rounds[state.currentRoundIndex];
      const { playerKey, bid } = action.payload;

      // Validate bid
      const player = state.players.find(p => p.key === playerKey);
      if (!player) throw new Error('Player not found');

      const teamPlayers = getTeamPlayers(state.players, player.team);
      const otherTeamPlayers = getTeamPlayers(state.players, getOpponentTeam(player.team));

      const currentTeamCalls = teamPlayers
        .filter(p => p.key !== playerKey)
        .map(p => currentRound.bids[p.key] || 0);
      const otherTeamCalls = otherTeamPlayers.map(p => currentRound.bids[p.key] || 0);

      const validation = validateBid(
        player.team === 'A' ? currentTeamCalls : otherTeamCalls,
        player.team === 'B' ? currentTeamCalls : otherTeamCalls,
        bid,
        player.team
      );

      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid bid');
      }

      // Update round with new bid
      const updatedRounds = state.rounds.map((round, index) => {
        if (index === state.currentRoundIndex) {
          return {
            ...round,
            bids: { ...round.bids, [playerKey]: bid },
          };
        }
        return round;
      });

      return {
        ...state,
        rounds: updatedRounds,
      };
    }

    case 'FINALIZE_BIDDING': {
      const currentRound = state.rounds[state.currentRoundIndex];
      try {
        const finalizedRound = finalizeBidding(currentRound, state.players);
        const updatedRounds = state.rounds.map((round, index) =>
          index === state.currentRoundIndex ? finalizedRound : round
        );

        return {
          ...state,
          rounds: updatedRounds,
          currentPhase: 'playing',
        };
      } catch (error) {
        throw new Error(`Bidding finalization failed: ${error}`);
      }
    }

    case 'RECORD_TRICK': {
      const currentRound = state.rounds[state.currentRoundIndex];
      const { playerKey, tricksWon } = action.payload;

      if (tricksWon < 0 || tricksWon > 8) {
        throw new Error('Tricks won must be between 0 and 8');
      }

      const updatedRounds = state.rounds.map((round, index) => {
        if (index === state.currentRoundIndex) {
          return {
            ...round,
            tricksWon: { ...round.tricksWon, [playerKey]: tricksWon },
          };
        }
        return round;
      });

      return {
        ...state,
        rounds: updatedRounds,
      };
    }

    case 'FINALIZE_SETTLEMENT': {
      const currentRound = state.rounds[state.currentRoundIndex];
      try {
        const finalizedRound = finalizeSettlement(currentRound, state.players);
        const updatedRounds = state.rounds.map((round, index) =>
          index === state.currentRoundIndex ? finalizedRound : round
        );

        // Update match totals
        const newMatchTotals: MatchTotals = {
          teamATotal: state.matchTotals.teamATotal + (finalizedRound.teamAScore || 0),
          teamBTotal: state.matchTotals.teamBTotal + (finalizedRound.teamBScore || 0),
          pointsToWin: 52,
          leaderTeam:
            state.matchTotals.teamATotal + (finalizedRound.teamAScore || 0) >
            state.matchTotals.teamBTotal + (finalizedRound.teamBScore || 0)
              ? 'A'
              : state.matchTotals.teamATotal + (finalizedRound.teamAScore || 0) <
                  state.matchTotals.teamBTotal + (finalizedRound.teamBScore || 0)
                ? 'B'
                : null,
          pointDifferential: Math.abs(
            (state.matchTotals.teamATotal + (finalizedRound.teamAScore || 0)) -
              (state.matchTotals.teamBTotal + (finalizedRound.teamBScore || 0))
          ),
          matchWinner: null,
        };

        const completion = checkMatchCompletion(
          newMatchTotals.teamATotal,
          newMatchTotals.teamBTotal
        );
        if (completion.isComplete && completion.winner) {
          newMatchTotals.matchWinner = completion.winner;
        }

        return {
          ...state,
          rounds: updatedRounds,
          matchTotals: newMatchTotals,
          currentPhase: completion.isComplete ? 'completed' : 'settlement',
        };
      } catch (error) {
        throw new Error(`Settlement finalization failed: ${error}`);
      }
    }

    case 'START_NEXT_ROUND': {
      if (state.matchTotals.matchWinner) {
        throw new Error('Cannot start new round: match is complete');
      }

      const currentRound = state.rounds[state.currentRoundIndex];
      const nextRound = createNextRound(currentRound, state.players);

      return {
        ...state,
        rounds: [...state.rounds, nextRound],
        currentRoundIndex: state.currentRoundIndex + 1,
        currentPhase: 'bidding',
      };
    }

    case 'UPDATE_SCORING_CONFIG': {
      // Note: Config is typically managed separately; this is for future extensions
      return state;
    }

    case 'UPDATE_TEAM_NAME': {
      const name = action.payload.name.trim();
      if (!name) return state;

      return {
        ...state,
        teamNames: {
          ...state.teamNames,
          [action.payload.team]: name,
        },
      };
    }

    case 'RESET_GAME': {
      return createCPGameState(state.players.map(p => p.name));
    }

    default:
      return state;
  }
};

/**
 * Custom Hook: useCourtPieceGame
 * Manages the complete Court Piece game lifecycle
 */
export const useCourtPieceGame = (initialPlayerNames?: string[]) => {
  const [gameState, dispatch] = useReducer(
    cpGameReducer,
    initialPlayerNames || ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'],
    (init) => createCPGameState(init)
  );
  const [pastStates, setPastStates] = useState<CPGameState[]>([]);
  const [futureStates, setFutureStates] = useState<CPGameState[]>([]);

  const dispatchWithHistory = useCallback((action: GameAction) => {
    setPastStates(previous => [...previous, gameState]);
    setFutureStates([]);
    dispatch(action);
  }, [gameState]);

  const undo = useCallback(() => {
    const previousState = pastStates[pastStates.length - 1];
    if (!previousState) return;
    setPastStates(previous => previous.slice(0, -1));
    setFutureStates(previous => [gameState, ...previous]);
    dispatch({ type: 'LOAD_GAME_STATE', payload: previousState });
  }, [gameState, pastStates]);

  const redo = useCallback(() => {
    const nextState = futureStates[0];
    if (!nextState) return;
    setFutureStates(previous => previous.slice(1));
    setPastStates(previous => [...previous, gameState]);
    dispatch({ type: 'LOAD_GAME_STATE', payload: nextState });
  }, [futureStates, gameState]);

  const [scoringConfig, setScoringConfig] = useState<CPScoringConfig>({
    allowFractionalOverTricks: false,
    defenderScoringMode: 'per-trick',
  });

  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'saving' | 'loading'>('idle');

  /**
   * Place a bid for a player
   */
  const placeBid = useCallback(
    (playerKey: string, bid: number) => {
      try {
        setError(null);
        dispatchWithHistory({ type: 'PLACE_BID', payload: { playerKey, bid } });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to place bid';
        setError(errorMessage);
      }
    },
    [dispatchWithHistory]
  );

  const updateRoundEntry = useCallback(
    (roundIndex: number, team: TeamId, value: number | null) => {
      setError(null);
      dispatchWithHistory({ type: 'UPDATE_ROUND_ENTRY', payload: { roundIndex, team, value } });
    },
    [dispatchWithHistory]
  );

  const loadGameState = useCallback((loadedGameState: CPGameState) => {
    setError(null);
    dispatch({ type: 'LOAD_GAME_STATE', payload: loadedGameState });
    setPastStates([]);
    setFutureStates([]);
  }, []);

  const resetGame = useCallback(() => {
    setError(null);
    dispatchWithHistory({ type: 'RESET_GAME' });
  }, [dispatchWithHistory]);

  /**
   * Finalize bidding and move to playing phase
   */
  const finalizeBiddingPhase = useCallback(() => {
    try {
      setError(null);
      dispatchWithHistory({ type: 'FINALIZE_BIDDING' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize bidding';
      setError(errorMessage);
    }
  }, [dispatchWithHistory]);

  /**
   * Record tricks won by a player
   */
  const recordTricksWon = useCallback((playerKey: string, tricksWon: number) => {
    try {
      setError(null);
      dispatchWithHistory({ type: 'RECORD_TRICK', payload: { playerKey, tricksWon } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record tricks';
      setError(errorMessage);
    }
  }, [dispatchWithHistory]);

  /**
   * Finalize settlement and calculate scores
   */
  const finalizeSettlementPhase = useCallback(() => {
    try {
      setError(null);
      dispatchWithHistory({ type: 'FINALIZE_SETTLEMENT' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize settlement';
      setError(errorMessage);
    }
  }, [dispatchWithHistory]);

  /**
   * Start next round
   */
  const startNextRound = useCallback(() => {
    try {
      setError(null);
      dispatchWithHistory({ type: 'START_NEXT_ROUND' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start next round';
      setError(errorMessage);
    }
  }, [dispatchWithHistory]);

  /**
   * Update player name
   */
  const updatePlayerName = useCallback((playerKey: string, newName: string) => {
    const updatedPlayers = gameState.players.map(p =>
      p.key === playerKey ? { ...p, name: newName } : p
    );

    const updatedRounds = gameState.rounds.map(round => ({
      ...round,
      bids: { ...round.bids },
      tricksWon: { ...round.tricksWon },
    }));

    // This is a simplified approach; in production, you'd dispatch a specific action
    // For now, reinitialize with updated names
  }, [gameState]);

  const updateTeamName = useCallback((team: TeamId, name: string) => {
    dispatchWithHistory({ type: 'UPDATE_TEAM_NAME', payload: { team, name } });
  }, [dispatchWithHistory]);

  /**
   * Get current round
   */
  const getCurrentRound = useCallback((): CPRoundData => {
    return gameState.rounds[gameState.currentRoundIndex];
  }, [gameState]);

  /**
   * Check if all bids are placed for current round
   */
  const areAllBidsPlaced = useCallback((): boolean => {
    const currentRound = gameState.rounds[gameState.currentRoundIndex];
    const teamAPlayer = getTeamPlayers(gameState.players, 'A')[0];
    const teamBPlayer = getTeamPlayers(gameState.players, 'B')[0];
    return Boolean(
      teamAPlayer &&
      teamBPlayer &&
      currentRound.bids[teamAPlayer.key] !== null &&
      currentRound.bids[teamBPlayer.key] !== null
    );
  }, [gameState]);

  /**
   * Check if all tricks are recorded for current round
   */
  const areAllTricksRecorded = useCallback((): boolean => {
    const currentRound = gameState.rounds[gameState.currentRoundIndex];
    return gameState.players.every(p => currentRound.tricksWon[p.key] !== null);
  }, [gameState]);

  /**
   * Get score differential display
   */
  const getScoreDifferential = useCallback((): string => {
    const { teamATotal, teamBTotal, pointsToWin, leaderTeam, pointDifferential } =
      gameState.matchTotals;

    if (leaderTeam) {
      const pointsLeft = pointsToWin - Math.max(teamATotal, teamBTotal);
      return `Team ${leaderTeam} leads by ${pointDifferential} pts — ${pointsLeft} pts left to win`;
    }

    return `Teams tied — ${pointsToWin - teamATotal} pts to reach ${pointsToWin}`;
  }, [gameState.matchTotals]);

  return {
    gameState,
    scoringConfig,
    setScoringConfig,
    error,
    loadingState,
    actions: {
      updateRoundEntry,
      loadGameState,
      resetGame,
      placeBid,
      finalizeBiddingPhase,
      recordTricksWon,
      finalizeSettlementPhase,
      startNextRound,
      updatePlayerName,
      updateTeamName,
      undo,
      redo,
      canUndo: pastStates.length > 0,
      canRedo: futureStates.length > 0,
    },
    selectors: {
      getCurrentRound,
      areAllBidsPlaced,
      areAllTricksRecorded,
      getScoreDifferential,
    },
  };
};
