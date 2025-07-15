
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GameState, SavedGame, RoundData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Download, Save } from 'lucide-react';

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function GameViewerPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      try {
        const history: SavedGame[] = JSON.parse(localStorage.getItem('callbreak-history') || '[]');
        const game = history.find(g => g.id.toString() === id);
        if (game) {
            setSavedGame(game);
        } else {
            console.error("Game not found");
        }
      } catch (error) {
        console.error("Failed to load game from history:", error);
      }
    }
  }, [id]);

  const gameState = useMemo(() => {
      if (!savedGame) return null;
      return {
          ...savedGame.gameState,
          startTime: savedGame.gameState.startTime ? new Date(savedGame.gameState.startTime) : null
      }
  }, [savedGame]);


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
  
  const handGradientClasses = [
    'bg-gradient-shimmer-1',
    'bg-gradient-shimmer-2',
    'bg-gradient-shimmer-3',
    'bg-gradient-shimmer-4',
    'bg-gradient-shimmer-5',
  ];

  const handleLoadGame = () => {
    if (savedGame) {
      localStorage.setItem('callbreak-gamestate', JSON.stringify(savedGame.gameState));
      router.push('/');
    }
  };

  if (!isMounted) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!gameState) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Card>
                <CardHeader>
                    <CardTitle>Game not found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The game you are looking for does not exist.</p>
                </CardContent>
                <CardFooter>
                     <Button onClick={() => router.push('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-1 sm:p-2 md:p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4">
          <Button onClick={() => router.push('/history')} variant="ghost" size="icon"><ArrowLeft /></Button>
          <div className="text-center">
            <CardTitle className="text-lg sm:text-xl">
                Game Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
                Tash on {savedGame ? new Date(savedGame.timestamp).toLocaleString() : ''}
            </p>
          </div>
          <div className="w-10"></div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[25px] w-[25px] text-center font-bold sticky left-0 bg-card z-10 p-1 text-xs border-r">R</TableHead>
                  {gameState.players.map((player) => (
                    <TableHead 
                      key={player.key} 
                      className="min-w-[50px] w-[50px] text-center font-bold truncate px-1 text-xs border-r"
                    >
                      {player.name}
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
                      {gameState.players.map((player) => {
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
                          >
                            <div className="p-1 w-full h-full min-h-[36px] flex flex-col justify-center">
                                <div className="text-sm font-bold">{round.scores[player.key] ?? "-"}</div>
                                <div className="text-[10px] text-muted-foreground">
                                {round.bids[player.key] !== null ? `${round.bids[player.key]}/${round.tricks[player.key]}` : ""}
                                </div>
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
                  {gameState.players.map((player) => (
                    <TableCell 
                        key={player.key} 
                        className="text-center font-bold text-base text-primary p-1 border-r"
                    >
                        {totalScores[player.key]}
                    </TableCell>
                  ))}
                  <TableCell className="border-l"></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-center font-bold sticky left-0 bg-card z-10 p-1 text-xs border-r">Rank</TableCell>
                  {gameState.players.map((player) => {
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
        <CardFooter className="flex justify-end p-2 bg-muted/50">
          <Button size="sm" onClick={handleLoadGame}>
            <Download className="mr-2 h-4 w-4" /> Load this Game
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
