"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { GameState, SavedGame } from "@/lib/types";
import { CPGameState } from "@/lib/court-piece-types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2 } from "lucide-react";

const getLoserName = (game: SavedGame): string => {
  if (game.gameMode === 'courtpiece') {
    const state = game.gameState as CPGameState;
    return `${state.teamNames.A}: ${state.matchTotals.teamATotal} - ${state.teamNames.B}: ${state.matchTotals.teamBTotal}`;
  }

  const callbreakState = game.gameState as GameState;
  const { players, rounds } = callbreakState;
  const totalScores: { [key: string]: number } = {};

  // Initialize totals
  players.forEach(player => {
    totalScores[player.key] = 0;
  });

  // Sum scores across all rounds
  rounds.forEach(round => {
    players.forEach(player => {
      const score = round.scores[player.key];
      if (score !== null) {
        totalScores[player.key] += score;
      }
    });
  });

  // Find the minimum score
  const minScore = Math.min(...Object.values(totalScores));

  // Get players with the minimum score
  const losers = players.filter(player => totalScores[player.key] === minScore);

  // Return names
  if (losers.length === 1) {
    return losers[0].name;
  } else {
    return losers.map(l => l.name).join(" & ");
  }
};

export default function HistoryPage() {
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<SavedGame[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    try {
      const history = localStorage.getItem("callbreak-history");
      if (history) {
        const parsedGames = JSON.parse(history) as SavedGame[];
        const sorted = parsedGames.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setSavedGames(sorted);
        setFilteredGames(sorted);
      }
    } catch (error) {
      console.error("Failed to load game history:", error);
    }
  }, []);

  useEffect(() => {
    const filtered = savedGames.filter((game) => {
      const timestampMatch = new Date(game.timestamp).toLocaleString().toLowerCase().includes(searchTerm.toLowerCase());
      const playerMatch = game.gameState.players.some((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const scoreMatch = Object.values(game.gameState.rounds)
        .flatMap((round) => game.gameMode === 'courtpiece'
          ? [round.teamAScore, round.teamBScore]
          : Object.values(round.scores))
        .some((score) => score?.toString().includes(searchTerm));
      return timestampMatch || playerMatch || scoreMatch;
    });
    setFilteredGames(filtered);
  }, [searchTerm, savedGames]);

  const handleViewGame = (gameId: number) => {
    router.push(`/game/viewer?id=${gameId}`);
  };

  const handleBackHome = () => {
    router.push(localStorage.getItem('default-game-mode') === 'courtpiece' ? '/court-piece' : '/');
  };

  const deleteHistory = () => {
    if (deletePassword !== 'tash') return false;
    localStorage.removeItem('callbreak-history');
    setSavedGames([]);
    setFilteredGames([]);
    setDeletePassword('');
    return true;
  };

  if (!isMounted) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-1 sm:p-2 md:p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle>Saved Games ({filteredGames.length})</CardTitle>
          <Input
            placeholder="Search by player name or score..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96 w-full rounded-md border">
            {filteredGames.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game, index) => (
                    <TableRow
                      key={game.id}
                      onClick={() => handleViewGame(game.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{new Date(game.timestamp).toLocaleString()} - {game.gameMode === 'courtpiece' ? 'Court Piece' : 'Callbreak'} - {getLoserName(game)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground p-4">
                No saved games found.
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex justify-between gap-2 pt-6">
          <Button onClick={handleBackHome} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete History</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your saved games. This action cannot be undone. Please enter the password to proceed.
                </AlertDialogDescription>
                <Input
                  id="history-delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="Enter password..."
                />
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    if (!deleteHistory()) event.preventDefault();
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </main>
  );
}
