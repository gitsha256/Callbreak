"use client";

import { useState, useEffect, useMemo } from 'react';
import { MoreVertical, Save, Upload, Trash2, Clock, Zap, RotateCcw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScoreDialog } from '@/components/score-dialog';
import { LoadGameDialog } from '@/components/load-game-dialog';
import { EditPlayersDialog } from '@/components/edit-players-dialog';
import { useToast } from "@/hooks/use-toast"
import { GameState, Player, SavedGame, initialGameState } from '@/lib/types';

const roundColors = [
  "bg-green-500/10", "bg-green-500/20", "bg-yellow-500/10", "bg-yellow-500/20",
  "bg-yellow-500/30", "bg-orange-500/10", "bg-orange-500/20", "bg-orange-500/30",
  "bg-red-500/10", "bg-red-500/20", "bg-red-500/30", "bg-red-500/40", "bg-red-500/50"
];

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    const savedState = localStorage.getItem('callbreak-gamestate');
    if (savedState) {
      try {
        const loadedGameState = JSON.parse(savedState);
        // Dates need to be reconstructed from strings
        const revivedGameState = {
            ...loadedGameState,
            startTime: loadedGameState.startTime ? new Date(loadedGameState.startTime) : null,
        };
        setGameState(revivedGameState);
      } catch (e) {
        console.error("Could not load game state from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('callbreak-gamestate', JSON.stringify(gameState));
    }
  }, [gameState, isMounted]);

  const handleScoreChange = (roundIndex: number, playerKey: string, bid: number, tricks: number) => {
    const newRounds = [...gameState.rounds];
    const round = newRounds[roundIndex];

    round.bids[playerKey] = bid;
    round.tricks[playerKey] = tricks;

    let score = 0;
    if (tricks < bid) {
      score = -bid;
    } else {
      score = bid + (tricks - bid) * 0.1;
    }
    round.scores[playerKey] = parseFloat(score.toFixed(1));

    setGameState({ ...gameState, rounds: newRounds });
  };

  const handlePlayerNameChange = (newPlayers: Player[]) => {
     // Create a new game state, preserving scores under new player keys
    const newRounds = gameState.rounds.map(round => {
        const newBids: { [key: string]: number | null } = {};
        const newTricks: { [key: string]: number | null } = {};
        const newScores: { [key: string]: number | null } = {};

        gameState.players.forEach((oldPlayer, index) => {
            const newPlayer = newPlayers[index];
            newBids[newPlayer.key] = round.bids[oldPlayer.key] ?? null;
            newTricks[newPlayer.key] = round.tricks[oldPlayer.key] ?? null;
            newScores[newPlayer.key] = round.scores[oldPlayer.key] ?? null;
        });

        return { bids: newBids, tricks: newTricks, scores: newScores };
    });

    setGameState({
        ...gameState,
        players: newPlayers,
        rounds: newRounds,
    });
    toast({ title: "Players Updated", description: "Player names have been changed." });
  };


  const totalScores = useMemo(() => {
    const totals: { [key: string]: number } = {};
    gameState.players.forEach(p => totals[p.key] = 0);

    gameState.rounds.forEach(round => {
      gameState.players.forEach(player => {
        totals[player.key] += round.scores[player.key] || 0;
      });
    });
    return totals;
  }, [gameState]);

  const ranks = useMemo(() => {
    const sortedScores = gameState.players.map(p => ({ key: p.key, score: totalScores[p.key] })).sort((a, b) => b.score - a.score);
    const playerRanks: { [key: string]: number } = {};
    sortedScores.forEach((player, index) => {
      playerRanks[player.key] = index + 1;
    });
    return playerRanks;
  }, [totalScores, gameState.players]);

  const kitnaPiche = useMemo(() => {
    const scores = Object.values(totalScores);
    if (scores.length < 2) return 0;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    return parseFloat((maxScore - minScore).toFixed(1));
  }, [totalScores]);

  const resetGame = () => {
    const freshState = initialGameState(gameState.players.map(p => p.name));
    setGameState(freshState);
    toast({ title: "Game Reset", description: "The scoreboard has been cleared." });
  };
  
  const handleStartTime = () => {
    if (!gameState.startTime) {
      setGameState({ ...gameState, startTime: new Date() });
      toast({ title: "Game Started", description: `The timer has begun.` });
    }
  };
  
  const saveGame = () => {
    try {
      const savedGames: SavedGame[] = JSON.parse(localStorage.getItem('callbreak-history') || '[]');
      const newSave: SavedGame = { id: Date.now(), timestamp: new Date(), gameState };
      savedGames.unshift(newSave);
      localStorage.setItem('callbreak-history', JSON.stringify(savedGames.slice(0, 50))); // Limit history
      toast({ title: "Game Saved", description: "Your progress has been added to history." });
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save game to history." });
    }
  };
  
  const loadGame = (loadedGameState: GameState) => {
    // Dates need to be reconstructed from strings
    const revivedGameState = {
        ...loadedGameState,
        startTime: loadedGameState.startTime ? new Date(loadedGameState.startTime) : null,
    };
    setGameState(revivedGameState);
    toast({ title: "Game Loaded", description: "Your progress has been restored." });
  };

  const deleteHistory = () => {
    localStorage.removeItem('callbreak-history');
    toast({ title: "History Deleted", description: "All saved games have been cleared." });
  }

  if (!isMounted) {
    return null; // Or a loading spinner
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-2 sm:p-4 md:p-8">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline text-2xl">Callbreak Companion</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <EditPlayersDialog players={gameState.players} onSave={handlePlayerNameChange} />
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={saveGame}><Save className="mr-2 h-4 w-4" /> Save to History</DropdownMenuItem>
              <LoadGameDialog onGameLoad={loadGame} />
              <DropdownMenuSeparator />
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete History</DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all your saved games. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteHistory} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[60px] sm:min-w-[80px] text-center font-bold sticky left-0 bg-card z-10">Round</TableHead>
                  {gameState.players.map(player => (
                    <TableHead key={player.key} className="min-w-[100px] sm:min-w-[120px] text-center font-bold truncate px-2">{player.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameState.rounds.map((round, roundIndex) => (
                  <TableRow key={roundIndex} className={`transition-all duration-300 ${roundColors[roundIndex]}`}>
                    <TableCell className="text-center font-semibold text-lg sticky left-0 bg-inherit z-10">{roundIndex + 1}</TableCell>
                    {gameState.players.map(player => (
                      <TableCell key={player.key} className="text-center p-1">
                        <ScoreDialog
                          player={player}
                          roundIndex={roundIndex}
                          currentBid={round.bids[player.key]}
                          currentTricks={round.tricks[player.key]}
                          onSave={handleScoreChange}
                        >
                          <div className="p-2 rounded-md hover:bg-primary/10 cursor-pointer transition-colors w-full h-full min-h-[50px] flex flex-col justify-center">
                            <div className="text-lg font-bold">{round.scores[player.key]?.toFixed(1) || "-"}</div>
                            <div className="text-xs text-muted-foreground">
                              {round.bids[player.key] !== null ? `${round.bids[player.key]} / ${round.tricks[player.key]}` : "Bid / Tricks"}
                            </div>
                          </div>
                        </ScoreDialog>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              <tfoot className="border-t-2 border-primary">
                <TableRow>
                  <TableCell className="text-center font-bold sticky left-0 bg-card z-10">Total</TableCell>
                  {gameState.players.map(player => (
                    <TableCell key={player.key} className="text-center font-bold text-xl text-primary">{totalScores[player.key].toFixed(1)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="text-center font-bold sticky left-0 bg-card z-10">Rank</TableCell>
                  {gameState.players.map(player => (
                    <TableCell key={player.key} className="text-center font-bold text-xl text-accent">{ranks[player.key]}</TableCell>
                  ))}
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 bg-muted/50">
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-5 w-5 text-orange-500" />
              Kitna Piche: <span className="font-bold text-lg">{kitnaPiche}</span>
            </div>
             <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-5 w-5 text-blue-500" />
                Start Time: <span className="font-bold text-lg">{gameState.startTime ? gameState.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Started'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleStartTime} variant="outline" disabled={!!gameState.startTime}><Clock className="mr-2 h-4 w-4" /> Start</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Game?</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to reset all scores to zero? This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetGame}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
