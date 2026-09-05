"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GameState, SavedGame } from '@/lib/types';
import { CPGameState } from '@/lib/court-piece-types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Download } from 'lucide-react';
import { loadGameFromCloud } from '@/lib/cloud-storage';
import { useToast } from '@/hooks/use-toast';

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function GameViewerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      const loadGame = async () => {
        setIsLoading(true);
        try {
          const gameState = await loadGameFromCloud(id);
          if (gameState) {
            const game: SavedGame = {
              id: parseInt(id) || Date.now(),
              timestamp: new Date(),
              gameState
            };
            setSavedGame(game);
          } else {
            // Fallback to localStorage for backward compatibility
            const history: SavedGame[] = JSON.parse(localStorage.getItem('callbreak-history') || '[]');
            const game = history.find(g => g.id.toString() === id);
            if (game) {
              setSavedGame(game);
            } else {
              console.error("Game not found");
              toast({
                title: "Game not found",
                description: "The requested game could not be found.",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error("Failed to load game:", error);
          toast({
            title: "Error loading game",
            description: "Failed to load the game. Please try again.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
      };

      loadGame();
    }
  }, [id, toast]);

  const gameState = useMemo(() => {
    if (!savedGame) return null;
    return {
      ...savedGame.gameState,
      startTime: savedGame.gameState.startTime ? new Date(savedGame.gameState.startTime) : null,
    } as GameState;
  }, [savedGame]);

  const courtPieceState = useMemo(() => {
    if (!savedGame || savedGame.gameMode !== 'courtpiece') return null;
    return savedGame.gameState as CPGameState;
  }, [savedGame]);

  const courtPieceWinNeeds = useMemo(() => {
    if (!courtPieceState) return null;
    const teamATotal = courtPieceState.matchTotals.teamATotal;
    const teamBTotal = courtPieceState.matchTotals.teamBTotal;
    const pointDifference = Math.abs(teamATotal - teamBTotal);
    const getNeeds = (teamTotal: number, opponentTotal: number) => {
      const needsRace = Math.max(0, 52 - teamTotal);
      const needsDifference = teamTotal > opponentTotal
        ? Math.max(0, 52 - pointDifference)
        : 52 + pointDifference;
      return {
        needsRace,
        needsDifference,
        fastest: Math.min(needsRace, needsDifference),
        isLeading: teamTotal > opponentTotal,
      };
    };
    return {
      pointDifference,
      A: getNeeds(teamATotal, teamBTotal),
      B: getNeeds(teamBTotal, teamATotal),
    };
  }, [courtPieceState]);

  const totalScores = useMemo(() => {
    const totals: { [key: string]: number } = {};
    if (!gameState || courtPieceState) return totals;
    gameState.players.forEach(p => (totals[p.key] = 0));
    gameState.rounds.forEach(round => {
      gameState.players.forEach(player => {
        const score = round.scores[player.key];
        if (score !== null && score !== undefined && Math.abs(score) >= 10) {
          totals[player.key] += score;
        }
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
      if (courtPieceState) {
        localStorage.setItem('callbreak-court-piece-gamestate', JSON.stringify(courtPieceState));
        router.push('/court-piece');
      } else {
        localStorage.setItem('callbreak-gamestate', JSON.stringify(savedGame.gameState));
        router.push('/?mode=callbreak');
      }
    }
  };

  const handleBackHome = () => {
    router.push(courtPieceState ? '/court-piece' : '/');
  };

  if (!isMounted || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading game...</p>
          </CardContent>
        </Card>
      </div>
    );
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
            <Button onClick={handleBackHome}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (courtPieceState) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-start bg-background p-1 sm:p-2 md:p-4">
        <Card className="w-full max-w-4xl shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4">
            <Button onClick={() => router.push('/history')} variant="ghost" size="icon"><ArrowLeft /></Button>
            <div className="text-center">
              <CardTitle className="text-lg sm:text-xl">Court Piece Game Summary</CardTitle>
              <p className="text-xs text-muted-foreground">Saved {savedGame ? new Date(savedGame.timestamp).toLocaleString() : ''}</p>
            </div>
            <div className="w-10" />
          </CardHeader>
          <CardContent className="space-y-4 p-2 sm:p-4">
            <Table>
              <TableHeader><TableRow><TableHead className="w-[30px] border-r p-1 text-center text-xs sm:w-[42px]">R</TableHead><TableHead className="border-r bg-blue-500/10 p-1 text-center text-xs sm:text-sm">{courtPieceState.teamNames.A}</TableHead><TableHead className="bg-red-500/10 p-1 text-center text-xs sm:text-sm">{courtPieceState.teamNames.B}</TableHead></TableRow></TableHeader>
              <TableBody>{courtPieceState.rounds.map(round => (
                <TableRow key={round.roundNumber} className="hover:bg-primary/5">
                  <TableCell className="border-r p-1 text-center text-xs font-semibold sm:text-sm">{round.roundNumber}</TableCell>
                  <TableCell className={`border-r p-1 text-center text-sm font-bold ${round.teamAScore !== null ? round.teamAScore < 0 ? 'bg-red-500/25' : 'bg-green-500/25' : ''}`}>{round.teamAScore ?? ''}</TableCell>
                  <TableCell className={`p-1 text-center text-sm font-bold ${round.teamBScore !== null ? round.teamBScore < 0 ? 'bg-red-500/25' : 'bg-green-500/25' : ''}`}>{round.teamBScore ?? ''}</TableCell>
                </TableRow>
              ))}</TableBody>
              <tfoot className="border-t-2 border-primary"><TableRow><TableCell className="border-r p-1 text-center text-[10px] font-bold sm:text-xs">Total</TableCell><TableCell className="border-r bg-blue-500/10 p-1 text-center text-base font-bold text-blue-600 sm:text-lg">{courtPieceState.matchTotals.teamATotal}</TableCell><TableCell className="bg-red-500/10 p-1 text-center text-base font-bold text-red-600 sm:text-lg">{courtPieceState.matchTotals.teamBTotal}</TableCell></TableRow></tfoot>
            </Table>
            {courtPieceWinNeeds && (
              <div className="space-y-3 border-t-2 border-primary bg-gradient-to-r from-red-500/10 to-orange-500/10 p-3">
                <div className="text-center text-sm font-bold text-muted-foreground">POINT DIFFERENCE: {courtPieceWinNeeds.pointDifference}</div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {(['A', 'B'] as const).map(team => {
                    const needs = courtPieceWinNeeds[team];
                    const total = courtPieceState.matchTotals[team === 'A' ? 'teamATotal' : 'teamBTotal'];
                    const isFastest = needs.fastest === Math.min(courtPieceWinNeeds.A.fastest, courtPieceWinNeeds.B.fastest);
                    return (
                      <div key={team} className={`rounded-md border p-3 ${isFastest ? 'border-green-500 bg-green-500/10' : 'bg-background/50'}`}>
                        <div className="flex items-center justify-between font-bold"><span>{courtPieceState.teamNames[team]}</span><span>{total >= 0 ? '+' : ''}{total}</span></div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div>52 k liye Chahiye= {needs.needsRace}</div>
                          {needs.isLeading && <div>By Difference= {needs.needsDifference}</div>}
                        </div>
                        <div className={`mt-2 text-sm font-bold ${isFastest ? 'text-green-600' : 'text-foreground'}`}>To Win {needs.fastest}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end p-2 bg-muted/50"><Button size="sm" onClick={handleLoadGame}><Download className="mr-2 h-4 w-4" /> Load this Game</Button></CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-1 sm:p-2 md:p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4">
          <Button onClick={() => router.push('/history')} variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
          <div className="text-center">
            <CardTitle className="text-lg sm:text-xl">Game Summary</CardTitle>
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
                  {gameState.players.map(player => (
                    <TableHead key={player.key} className="min-w-[50px] w-[50px] text-center font-bold truncate px-1 text-xs border-r">
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
                      <TableCell className="text-center font-semibold text-sm sticky left-0 bg-inherit z-10 p-1 border-r">
                        {roundIndex + 1}
                      </TableCell>
                      {gameState.players.map(player => {
                        const score = round.scores[player.key];
                        const scoreBgColor =
                          score !== null && score !== undefined
                            ? score > 0
                              ? 'bg-green-500/30 dark:bg-green-800/50'
                              : score < 0
                              ? 'bg-red-500/30 dark:bg-red-800/50'
                              : ''
                            : '';

                        return (
                          <TableCell
                            key={player.key}
                            className={cn('text-center p-0', 'border-r', scoreBgColor)}
                          >
                            <div className="p-1 w-full h-full min-h-[36px] flex flex-col justify-center">
                              <div className="text-sm font-bold">{score ?? '-'}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {round.bids[player.key] !== null ? `${round.bids[player.key]}/${round.tricks[player.key]}` : ''}
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell
                        className={cn(
                          'text-center font-bold text-sm border-l p-1 text-black',
                          handGradientClasses[roundIndex % handGradientClasses.length]
                        )}
                      >
                        {handSum > 0 ? handSum : ''}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot className="border-t-2 border-primary">
                <TableRow>
                  <TableCell className="text-center font-bold sticky left-0 bg-card z-10 p-1 text-xs border-r">Total</TableCell>
                  {gameState.players.map(player => {
                    const totalScore = totalScores[player.key];
                    return (
                      <TableCell key={player.key} className="text-center font-bold text-base text-primary p-1 border-r">
                        {totalScore === 0 || Math.abs(totalScore) >= 10 ? totalScore : ''}
                      </TableCell>
                    );
                  })}
                  <TableCell className="border-l"></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-center font-bold sticky left-0 bg-card z-10 p-1 text-xs border-r">Rank</TableCell>
                  {gameState.players.map(player => {
                    const rank = ranks[player.key];
                    const rankColorClass =
                      rank === 1
                        ? 'bg-green-300 dark:bg-green-800'
                        : rank === 3
                        ? 'bg-yellow-300 dark:bg-yellow-800'
                        : rank === 4
                        ? 'bg-red-300 dark:bg-red-800'
                        : '';
                    return (
                      <TableCell
                        key={player.key}
                        className={cn('text-center font-bold text-base p-1', 'border-r', rankColorClass)}
                      >
                        {getOrdinal(rank)}
                      </TableCell>
                    );
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
