"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SavedGame } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export default function HistoryPage() {
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<SavedGame[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
        .flatMap((round) => Object.values(round.scores))
        .some((score) => score?.toString().includes(searchTerm));
      return timestampMatch || playerMatch || scoreMatch;
    });
    setFilteredGames(filtered);
  }, [searchTerm, savedGames]);

  const handleViewGame = (gameId: number) => {
    router.push(`/game/viewer?id=${gameId}`);
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
                      <TableCell>{new Date(game.timestamp).toLocaleString()}</TableCell>
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
        <CardFooter className="flex justify-start pt-6">
          <Button onClick={() => router.push("/")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
