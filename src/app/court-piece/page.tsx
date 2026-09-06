/**
 * Court Piece Game Page
 * Main entry point for 6-player team-based game mode
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CPScorecard } from '@/components/cp-scorecard';
import { useCourtPieceGame } from '@/hooks/use-court-piece-game';
import { useToast } from '@/hooks/use-toast';
import { saveGameToCloud, loadGameFromCloud, generateGameId, getGameIdFromUrl, updateUrlWithGameId } from '@/lib/cloud-storage';
import { CPGameState } from '@/lib/court-piece-types';
import { RotateCcw } from 'lucide-react';

const defaultPlayerNames = ['Player A-1', 'Player B-1', 'Player A-2', 'Player B-2', 'Player A-3', 'Player B-3'];

export default function CourtPiecePage() {
  const router = useRouter();
  const { toast } = useToast();

  // Game state
  const {
    gameState,
    actions,
  } = useCourtPieceGame(defaultPlayerNames);
  const loadGameState = actions.loadGameState;

  // UI state
  const [playerNames, setPlayerNames] = useState(defaultPlayerNames);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);


  // Initialize game
  useEffect(() => {
    setIsMounted(true);
    const initializeGame = async () => {
      const urlGameId = getGameIdFromUrl();

      if (urlGameId) {
        setIsLoading(true);
        try {
          const loadedGameState = await loadGameFromCloud(urlGameId);
          if (loadedGameState && 'players' in loadedGameState) {
            setGameId(urlGameId);
            loadGameState(loadedGameState as CPGameState);
            toast({
              title: 'Game loaded',
              description: 'Successfully loaded Court Piece game from cloud',
            });
          }
        } catch (error) {
          console.error('Failed to load game:', error);
          toast({
            title: 'Error loading game',
            description: 'Failed to load game. Starting new game.',
            variant: 'destructive',
          });
          const newId = generateGameId();
          setGameId(newId);
          updateUrlWithGameId(newId);
        }
        setIsLoading(false);
      } else {
        const newId = generateGameId();
        setGameId(newId);
        updateUrlWithGameId(newId);
      }
    };

    initializeGame();
  }, [loadGameState, toast]);

  // Auto-save to cloud
  useEffect(() => {
    if (isMounted && gameId && gameState) {
      const timeoutId = setTimeout(async () => {
        try {
          await saveGameToCloud(gameId, gameState);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [gameState, isMounted, gameId]);

  const copyGameId = async () => {
    if (gameId) {
      try {
        await navigator.clipboard.writeText(gameId);
        setCopiedGameId(true);
        toast({
          title: 'Game ID copied',
          description: 'Share this ID to play together',
        });
        setTimeout(() => setCopiedGameId(false), 2000);
      } catch (error) {
        toast({
          title: 'Failed to copy',
          description: 'Please manually copy the game ID',
          variant: 'destructive',
        });
      }
    }
  };

  const shareGame = async () => {
    if (gameId) {
      const shareUrl = `${window.location.origin}/court-piece?gameId=${gameId}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Court Piece Game',
            text: 'Join me for Court Piece!',
            url: shareUrl,
          });
        } catch (error) {
          copyGameId();
        }
      } else {
        copyGameId();
      }
    }
  };

  const handleLoadGame = async (requestedGameId: string) => {
    if (!requestedGameId) return;
    setIsLoading(true);
    try {
      const loadedGameState = await loadGameFromCloud(requestedGameId);
      if (loadedGameState && 'players' in loadedGameState) {
        loadGameState(loadedGameState as CPGameState);
        setGameId(requestedGameId);
        updateUrlWithGameId(requestedGameId);
        toast({ title: 'Game loaded', description: 'The shared Court Piece game is ready.' });
      } else {
        toast({ title: 'Game not found', description: 'No game found with that Kamra No.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      toast({ title: 'Error loading game', description: 'Could not load the shared game.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAndSave = async () => {
    if (gameId) await saveGameToCloud(gameId, gameState);
    actions.resetGame();
  };

  const deleteHistory = (password: string) => {
    if (password !== 'tash') {
      toast({ title: 'Incorrect password', variant: 'destructive' });
      return false;
    }
    localStorage.removeItem('callbreak-history');
    toast({ title: 'Saved games deleted' });
    return true;
  };

  const handlePlayerNameChange = (index: number, newName: string) => {
    const newNames = [...playerNames];
    newNames[index] = newName;
    setPlayerNames(newNames);
  };

  const startGame = () => {
    // Names are already set in state
    setShowSetupDialog(false);
  };

  return (
    <>
        {gameState.currentPhase === 'completed' ? (
          <Card className="border-2 border-green-500 bg-green-50">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-green-900">
                {gameState.matchTotals.matchWinner === 'A' ? 'Team A' : 'Team B'} Wins!
              </CardTitle>
              <CardDescription className="text-lg">
                Final Score: Team A {gameState.matchTotals.teamATotal} - Team B {gameState.matchTotals.teamBTotal}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-4">
              <Button
                onClick={() => setShowResetConfirm(true)}
                size="lg"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Start New Match
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push('/')}>
                Back to Home
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CPScorecard
            rounds={gameState.rounds}
            teamNames={gameState.teamNames}
            onUpdateTeamName={actions.updateTeamName}
            teamATotal={gameState.matchTotals.teamATotal}
            teamBTotal={gameState.matchTotals.teamBTotal}
            onUpdateRoundEntry={actions.updateRoundEntry}
            startTime={gameState.startTime}
            gameId={gameId}
            copiedGameId={copiedGameId}
            onCopyGameId={copyGameId}
            onShareGame={shareGame}
            onLoadGame={handleLoadGame}
            onSavedGames={() => router.push('/history')}
            onDeleteHistory={deleteHistory}
            onClear={handleClearAndSave}
            onUndo={actions.undo}
            onRedo={actions.redo}
            canUndo={actions.canUndo}
            canRedo={actions.canRedo}
          />
        )}

      {/* Player Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Player Names</DialogTitle>
            <DialogDescription>
              Court Piece requires 6 players (3 per team, alternating)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Team A */}
              <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900">Team A</h3>
                {[0, 2, 4].map(index => (
                  <div key={index}>
                    <Label className="text-sm">Player {index / 2 + 1}</Label>
                    <Input
                      value={playerNames[index]}
                      onChange={e => handlePlayerNameChange(index, e.target.value)}
                      placeholder={`Team A Player ${index / 2 + 1}`}
                    />
                  </div>
                ))}
              </div>

              {/* Team B */}
              <div className="space-y-3 p-3 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-red-900">Team B</h3>
                {[1, 3, 5].map(index => (
                  <div key={index}>
                    <Label className="text-sm">Player {(index - 1) / 2 + 1}</Label>
                    <Input
                      value={playerNames[index]}
                      onChange={e => handlePlayerNameChange(index, e.target.value)}
                      placeholder={`Team B Player ${(index - 1) / 2 + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startGame}>Start Game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Match?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all scores and start a new match. The current match data will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowResetConfirm(false);
                // Reset game - would need to implement this in the hook
              }}
            >
              Start New Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
