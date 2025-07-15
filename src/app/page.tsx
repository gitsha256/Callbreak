
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { MoreVertical, Save, Trash2, Drumstick, RotateCcw, PlusCircle, Undo, Redo, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LoadGameDialog } from '@/components/load-game-dialog';
import { GameState, Player, SavedGame, initialGameState, RoundData } from '@/lib/types';
import { ThemeToggle } from '@/components/theme-toggle';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function Home() {
  const [history, setHistory] = useState<GameState[]>([initialGameState()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCell, setEditingCell] = useState<{ type: 'player' | 'score'; key: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const gameState = history[historyIndex];

  const updateGameState = (newState: GameState | ((prevState: GameState) => GameState)) => {
    setHistory(prevHistory => {
        const currentState = prevHistory[historyIndex];
        const nextState = typeof newState === 'function' ? newState(currentState) : newState;
        const newHistory = [...prevHistory.slice(0, historyIndex + 1), nextState];
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const savedState = localStorage.getItem('callbreak-gamestate');
    if (savedState) {
      try {
        const loadedGameState = JSON.parse(savedState);
        const revivedGameState = {
            ...loadedGameState,
            startTime: loadedGameState.startTime ? new Date(loadedGameState.startTime) : null,
        };
        setHistory([revivedGameState]);
        setHistoryIndex(0);
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

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const handlePlayerNameChange = (playerKey: string, newName: string) => {
    if (!newName.trim()) {
        setEditingCell(null);
        return;
    }
    updateGameState(prevState => {
        const newPlayers = prevState.players.map(p =>
            p.key === playerKey ? { ...p, name: newName } : p
        );
        return { ...prevState, players: newPlayers };
    });
    setEditingCell(null);
  };
  
  const handleScoreChange = (roundIndex: number, playerKey: string, newScore: number) => {
    if (isNaN(newScore)) {
        setEditingCell(null);
        return;
    }
    updateGameState(prevState => {
        const newRounds = [...prevState.rounds];
        const round = newRounds[roundIndex];
    
        round.scores[playerKey] = Math.round(newScore);
        round.bids[playerKey] = null;
        round.tricks[playerKey] = null;

        return {
          ...prevState,
          rounds: newRounds,
          startTime: prevState.startTime || new Date(),
        };
    });
    setEditingCell(null);
  };

  const handlePlayerNameSaveOnEnter = (e: React.KeyboardEvent<HTMLInputElement>, playerKey: string) => {
    if (e.key === 'Enter') {
        handlePlayerNameChange(playerKey, e.currentTarget.value);
    } else if (e.key === 'Escape') {
        setEditingCell(null);
    }
  };

  const handleScoreSaveOnEnter = (e: React.KeyboardEvent<HTMLInputElement>, roundIndex: number, playerKey: string) => {
    if (e.key === 'Enter') {
        handleScoreChange(roundIndex, playerKey, parseInt(e.currentTarget.value, 10));
    } else if (e.key === 'Escape') {
        setEditingCell(null);
    }
  };

  const totalScores = useMemo(() => {
    const totals: { [key: string]: number } = {};
    if (!gameState) return totals;
    gameState.players.forEach(p => totals[p.key] = 0);

    gameState.rounds.forEach(round => {
      gameState.players.forEach(player => {
        totals[player.key] += round.scores[player.key] || 0;
      });
    });
    return totals;
  }, [gameState]);

  const sortedPlayers = useMemo(() => {
    if (!gameState) return [];
    return gameState.players
      .map(p => ({ ...p, score: totalScores[p.key] }))
      .sort((a, b) => b.score - a.score);
  }, [totalScores, gameState]);

  const ranks = useMemo(() => {
    const playerRanks: { [key: string]: number } = {};
    if (sortedPlayers.length === 0) return playerRanks;
  
    let rank = 1;
    playerRanks[sortedPlayers[0].key] = rank;
  
    for (let i = 1; i < sortedPlayers.length; i++) {
      if (sortedPlayers[i].score < sortedPlayers[i - 1].score) {
        rank = i + 1;
      }
      playerRanks[sortedPlayers[i].key] = rank;
    }
    return playerRanks;
  }, [sortedPlayers]);

  const picheData = useMemo(() => {
    const playersWithRank = sortedPlayers.map(p => ({ ...p, rank: ranks[p.key] }));
    const thirdPlacePlayers = playersWithRank.filter(p => p.rank === 3);
    const fourthPlacePlayers = playersWithRank.filter(p => p.rank === 4);
  
    if (fourthPlacePlayers.length > 1) {
      return { displayText: "Clash" };
    }
  
    if (thirdPlacePlayers.length === 0 || fourthPlacePlayers.length === 0) {
      return { displayText: "Piche: 0" };
    }
    
    const thirdPlaceScore = thirdPlacePlayers[0].score;
    const fourthPlaceScore = fourthPlacePlayers[0].score;
    const piche = thirdPlaceScore - fourthPlaceScore;
  
    return { displayText: `${fourthPlacePlayers[0].name}: ${piche} Piche` };
  
  }, [sortedPlayers, ranks]);


  const resetGame = () => {
    const freshState = initialGameState(gameState.players.map(p => p.name));
    updateGameState(freshState);
  };
  
  const saveGame = () => {
    try {
      const savedGames: SavedGame[] = JSON.parse(localStorage.getItem('callbreak-history') || '[]');
      const newSave: SavedGame = { id: Date.now(), timestamp: new Date(), gameState };
      savedGames.unshift(newSave);
      localStorage.setItem('callbreak-history', JSON.stringify(savedGames.slice(0, 50)));
    } catch (error) {
      console.error("Could not save game to history.", error);
    }
  };
  
  const loadGame = (loadedGameState: GameState) => {
    const revivedGameState = {
        ...loadedGameState,
        startTime: loadedGameState.startTime ? new Date(loadedGameState.startTime) : null,
    };
    updateGameState(revivedGameState);
    setEditingCell(null);
  };

  const deleteHistory = () => {
    if (deletePassword === 'tash') {
        localStorage.removeItem('callbreak-history');
        setDeletePassword('');
        return true; // Indicate success
    }
    alert('Incorrect password.');
    return false; // Indicate failure
  }
  
  const handleAddRound = () => {
    updateGameState(prevState => {
        const newRound: RoundData = {
          bids: {},
          tricks: {},
          scores: {},
        };
        prevState.players.forEach(player => {
          newRound.bids[player.key] = null;
          newRound.tricks[player.key] = null;
          newRound.scores[player.key] = null;
        });
        return {
          ...prevState,
          rounds: [...prevState.rounds, newRound],
        };
    });
  };

  const handleClearAndSave = () => {
    saveGame();
    resetGame();
  }

  if (!isMounted || !gameState) {
    return null;
  }
  
  const handGradientClasses = [
    'bg-gradient-shimmer-1',
    'bg-gradient-shimmer-2',
    'bg-gradient-shimmer-3',
    'bg-gradient-shimmer-4',
    'bg-gradient-shimmer-5',
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-1 sm:p-2 md:p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4">
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex === 0}><Undo /></Button>
                 <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex === history.length - 1}><Redo /></Button>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
                <Drumstick className="h-4 w-4 text-orange-500" />
                <span className="font-bold text-base">{picheData.displayText}</span>
            </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ThemeToggle />
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleAddRound}><PlusCircle className="mr-2 h-4 w-4" /> Add Round</DropdownMenuItem>
                <DropdownMenuSeparator />
                <LoadGameDialog />
                <DropdownMenuSeparator />
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete History</DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your saved games. This action cannot be undone. Please enter the password to proceed.
                      </AlertDialogDescription>
                       <div className="space-y-2 pt-2">
                         <Label htmlFor="delete-password">Password</Label>
                         <Input
                           id="delete-password"
                           type="password"
                           value={deletePassword}
                           onChange={(e) => setDeletePassword(e.target.value)}
                           placeholder="Enter password..."
                         />
                       </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                            if (!deleteHistory()) {
                                e.preventDefault(); // Prevent dialog from closing on incorrect password
                            }
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[25px] w-[25px] text-center font-bold sticky left-0 bg-card z-10 p-1 text-xs border-r">R</TableHead>
                  {gameState.players.map((player, index) => (
                    <TableHead 
                      key={player.key} 
                      className={cn(
                          "min-w-[50px] w-[50px] text-center font-bold truncate px-1 text-xs cursor-pointer hover:bg-primary/10",
                          "border-r"
                      )}
                      onClick={() => setEditingCell({ type: 'player', key: player.key })}
                    >
                      {editingCell?.type === 'player' && editingCell.key === player.key ? (
                        <Input
                          ref={inputRef}
                          type="text"
                          defaultValue={player.name}
                          onBlur={(e) => handlePlayerNameChange(player.key, e.target.value)}
                          onKeyDown={(e) => handlePlayerNameSaveOnEnter(e, player.key)}
                          className="h-6 text-center text-xs p-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        player.name
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[25px] w-[25px] text-center font-bold p-1 text-xs border-l">H</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameState.rounds.map((round, roundIndex) => {
                  const handSum = gameState.players.reduce((acc, player) => {
                      const score = round.scores[player.key];
                      if (score === null || isNaN(score) || score < 0) return acc;
                      return acc + score.toString().split('').reduce((sum, digit) => sum + parseInt(digit, 10), 0);
                  }, 0);

                  return (
                    <TableRow key={roundIndex}>
                      <TableCell className="text-center font-semibold text-sm sticky left-0 bg-inherit z-10 p-1 border-r">{roundIndex + 1}</TableCell>
                      {gameState.players.map((player, playerIndex) => {
                        const cellKey = `${roundIndex}-${player.key}`;
                        const isEditing = editingCell?.type === 'score' && editingCell.key === cellKey;
                        const score = round.scores[player.key];
                        
                        const scoreBgColor = score !== null && score !== undefined
                            ? score > 0 ? 'bg-green-500/30 dark:bg-green-800/50' : score < 0 ? 'bg-red-500/30 dark:bg-red-800/50' : ''
                            : '';
                        
                        return (
                          <TableCell 
                            key={player.key} 
                            className={cn(
                              "text-center p-0",
                              "border-r",
                              scoreBgColor
                            )}
                            onClick={() => setEditingCell({ type: 'score', key: cellKey })}
                          >
                            <div className="p-1 rounded-md hover:bg-primary/10 cursor-pointer transition-colors w-full h-full min-h-[36px] flex flex-col justify-center">
                              {isEditing ? (
                                 <Input
                                   ref={inputRef}
                                   type="number"
                                   step="1"
                                   defaultValue={round.scores[player.key]?.toString() || ''}
                                   onBlur={(e) => handleScoreChange(roundIndex, player.key, parseInt(e.target.value, 10))}
                                   onKeyDown={(e) => handleScoreSaveOnEnter(e, roundIndex, player.key)}
                                   className="h-6 text-center text-xs p-1"
                                   onClick={(e) => e.stopPropagation()}
                                 />
                              ) : (
                                  <>
                                      <div className="text-sm font-bold">{round.scores[player.key] ?? "-"}</div>
                                      <div className="text-[10px] text-muted-foreground">
                                      {round.bids[player.key] !== null ? `${round.bids[player.key]}/${round.tricks[player.key]}` : ""}
                                      </div>
                                  </>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className={cn("text-center font-bold text-sm border-l p-1 text-black", handGradientClasses[roundIndex % handGradientClasses.length])}>
                        {handSum > 0 ? handSum : ""}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <tfoot className="border-t-2 border-primary">
                <TableRow>
                  <TableCell className="text-center font-bold sticky left-0 bg-card z-10 p-1 text-xs border-r">Total</TableCell>
                  {gameState.players.map((player, index) => (
                    <TableCell 
                        key={player.key} 
                        className={cn(
                            "text-center font-bold text-base text-primary p-1",
                            "border-r"
                        )}
                    >
                        {totalScores[player.key]}
                    </TableCell>
                  ))}
                  <TableCell className="border-l"></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-center font-bold sticky left-0 bg-card z-10 p-1 text-xs border-r">Rank</TableCell>
                  {gameState.players.map((player, index) => {
                    const rank = ranks[player.key];
                    const rankColorClass = 
                      rank === 1 ? 'bg-green-300 dark:bg-green-800' :
                      rank === 3 ? 'bg-yellow-300 dark:bg-yellow-800' :
                      rank === 4 ? 'bg-red-300 dark:bg-red-800' :
                      '';
                    return (
                      <TableCell 
                          key={player.key} 
                          className={cn(
                              "text-center font-bold text-base p-1",
                              "border-r",
                              rankColorClass
                          )}
                      >
                          {getOrdinal(rank)}
                      </TableCell>
                    )
                  })}
                   <TableCell className="border-l"></TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end items-center p-2 bg-muted/50">
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={saveGame}><Save className="mr-1 h-4 w-4" /> Save</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive"><RotateCcw className="mr-1 h-4 w-4" /> Clear</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Game?</AlertDialogTitle>
                  <AlertDialogDescription>This will save the current game and clear all scores to zero. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAndSave}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
