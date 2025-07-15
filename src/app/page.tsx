"use client";

import { useState, useEffect, useMemo } from 'react';
import { MoreVertical, Save, Upload, Trash2, Clock, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScoreDialog } from '@/components/score-dialog';
import { LoadGameDialog } from '@/components/load-game-dialog';
import { useToast } from "@/hooks/use-toast"
import { GameState, Player, RoundData, SavedGame, initialGameState } from '@/lib/types';

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
    // You could load the last game state from localStorage here if desired
  }, []);

  const handleScoreChange = (roundIndex: number, player: Player, bid: number, tricks: number) => {
    const newRounds = [...gameState.rounds];
    const round = newRounds[roundIndex];

    round.bids[player] = bid;
    round.tricks[player] = tricks;

    let score = 0;
    if (tricks < bid) {
      score = -bid;
    } else {
      score = bid + (tricks - bid) * 0.1;
    }
    round.scores[player] = parseFloat(score.toFixed(1));

    setGameState({ ...gameState, rounds: newRounds });
  };

  const totalScores = useMemo(() => {
    const totals: { [key: Player]: number } = { Player1: 0, Player2: 0, Player3: 0, Player4: 0 };
    gameState.rounds.forEach(round => {
      gameState.players.forEach(player => {
        totals[player] += round.scores[player] || 0;
      });
    });
    return totals;
  }, [gameState]);

  const ranks = useMemo(() => {
    const sortedScores = Object.entries(totalScores).sort((a, b) => b[1] - a[1]);
    const playerRanks: { [key: Player]: number } = {} as any;
    sortedScores.forEach(([player, score], index) => {
      playerRanks[player as Player] = index + 1;
    });
    return playerRanks;
  }, [totalScores]);

  const kitnaPiche = useMemo(() => {
    const scores = Object.values(totalScores);
    if (scores.length < 2) return 0;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    return parseFloat((maxScore - minScore).toFixed(1));
  }, [totalScores]);

  const resetGame = () => {
    setGameState(initialGameState);
    toast({ title: "Game Reset", description: "The scoreboard has been cleared." });
  };
  
  const handleStartTime = () => {
    setGameState({ ...gameState, startTime: new Date() });
    toast({ title: "Game Started", description: `The timer has begun.` });
  };
  
  const saveGame = () => {
    try {
      const savedGames: SavedGame[] = JSON.parse(localStorage.getItem('callbreak-history') || '[]');
      const newSave: SavedGame = { id: Date.now(), timestamp: new Date(), gameState };
      savedGames.unshift(newSave);
      localStorage.setItem('callbreak-history', JSON.stringify(savedGames));
      toast({ title: "Game Saved", description: "Your progress has been saved." });
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save game." });
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8 font-body">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline text-2xl">Callbreak Companion</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={saveGame}><Save className="mr-2 h-4 w-4" /> Save Game</DropdownMenuItem>
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
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px] text-center font-bold">Round</TableHead>
                  {gameState.players.map(player => (
                    <TableHead key={player} className="min-w-[120px] text-center font-bold">{player}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameState.rounds.map((round, roundIndex) => (
                  <TableRow key={roundIndex} className={`transition-all duration-300 ${roundColors[roundIndex]}`}>
                    <TableCell className="text-center font-semibold text-lg">{roundIndex + 1}</TableCell>
                    {gameState.players.map(player => (
                      <TableCell key={player} className="text-center p-1">
                        <ScoreDialog
                          player={player}
                          roundIndex={roundIndex}
                          currentBid={round.bids[player]}
                          currentTricks={round.tricks[player]}
                          onSave={handleScoreChange}
                        >
                          <div className="p-2 rounded-md hover:bg-primary/10 cursor-pointer transition-colors w-full h-full min-h-[50px] flex flex-col justify-center">
                            <div className="text-lg font-bold">{round.scores[player]?.toFixed(1) || "-"}</div>
                            <div className="text-xs text-muted-foreground">
                              {round.bids[player] !== null ? `${round.bids[player]} / ${round.tricks[player]}` : "Bid / Tricks"}
                            </div>
                          </div>
                        </ScoreDialog>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="font-bold text-foreground text-left">
                        <div className="flex items-center text-lg">Total</div>
                    </div>
                    <div className="font-bold text-foreground text-left sm:text-right">
                        <div className="flex items-center sm:justify-end text-lg">Rank</div>
                    </div>
                </div>
              </TableCaption>
              <tfoot className="border-t-2 border-primary">
                <TableRow>
                  <TableCell className="text-center font-bold">Total</TableCell>
                  {gameState.players.map(player => (
                    <TableCell key={player} className="text-center font-bold text-xl text-primary">{totalScores[player].toFixed(1)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="text-center font-bold">Rank</TableCell>
                  {gameState.players.map(player => (
                    <TableCell key={player} className="text-center font-bold text-xl text-accent">{ranks[player]}</TableCell>
                  ))}
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 bg-muted/50">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-5 w-5 text-orange-500" />
              Kitna Piche: <span className="font-bold text-lg">{kitnaPiche}</span>
            </div>
             <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-5 w-5 text-blue-500" />
                Start Time: <span className="font-bold text-lg">{gameState.startTime ? gameState.startTime.toLocaleTimeString() : 'Not Started'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleStartTime} variant="outline"><Clock className="mr-2 h-4 w-4" /> Start Time</Button>
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
