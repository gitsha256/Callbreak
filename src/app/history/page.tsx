
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SavedGame } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export default function HistoryPage() {
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    try {
      const history = localStorage.getItem('callbreak-history');
      if (history) {
        // Sort games from newest to oldest
        setSavedGames(JSON.parse(history).sort((a: SavedGame, b: SavedGame) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        setSavedGames([]);
      }
    } catch (error) {
      console.error("Failed to load game history:", error);
      setSavedGames([]);
    }
  }, []);

  const handleViewGame = (gameId: number) => {
    router.push(`/game/${gameId}`);
  };

  if (!isMounted) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-1 sm:p-2 md:p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle>Saved Games ({savedGames.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96 w-full rounded-md border">
            {savedGames.length > 0 ? (
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {savedGames.map((game, index) => (
                    <TableRow key={game.id} onClick={() => handleViewGame(game.id)} className="cursor-pointer">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                        {new Date(game.timestamp).toLocaleString()}
                        </TableCell>
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
             <Button onClick={() => router.push('/')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
