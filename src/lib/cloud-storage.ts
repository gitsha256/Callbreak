"use client";

import { GameState } from './types';
import { CPGameState } from './court-piece-types';

export type SupportedGameState = GameState | CPGameState;

export const isCourtPieceGameState = (gameState: SupportedGameState): gameState is CPGameState => {
  return 'teamNames' in gameState && 'matchTotals' in gameState && gameState.players.every(player => 'team' in player);
};

export const isCallbreakGameState = (gameState: SupportedGameState): gameState is GameState => {
  return !isCourtPieceGameState(gameState) && gameState.rounds.every(round => 'scores' in round);
};

// Cloudflare Worker URLs - replace with your actual deployed Worker URLs
const SAVE_GAME_URL = process.env.NEXT_PUBLIC_SAVE_GAME_URL || 'https://your-worker.your-domain.workers.dev/save-game';
const LOAD_GAME_URL = process.env.NEXT_PUBLIC_LOAD_GAME_URL || 'https://your-worker.your-domain.workers.dev/load-game';

export interface CloudGameData {
  gameId: string;
  gameState: SupportedGameState;
  lastModified: Date;
}

export const generateGameId = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit number
};

export const saveGameToCloud = async (gameId: string, gameState: SupportedGameState): Promise<boolean> => {
  try {
    const response = await fetch(SAVE_GAME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId,
        gameState,
        lastModified: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save game: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving game to cloud:', error);
    return false;
  }
};

export const loadGameFromCloud = async <T extends SupportedGameState = SupportedGameState>(gameId: string): Promise<T | null> => {
  try {
    const response = await fetch(`${LOAD_GAME_URL}?gameId=${encodeURIComponent(gameId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Game not found
      }
      throw new Error(`Failed to load game: ${response.statusText}`);
    }

    const data: CloudGameData = await response.json();

    // Revive Date objects
    const revivedGameState: T = {
      ...data.gameState,
      startTime: data.gameState.startTime ? new Date(data.gameState.startTime) : null,
    } as T;

    return revivedGameState;
  } catch (error) {
    console.error('Error loading game from cloud:', error);
    return null;
  }
};

export const getGameIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('gameId');
};

export const updateUrlWithGameId = (gameId: string): void => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('gameId', gameId);
  window.history.replaceState({}, '', url.toString());
};