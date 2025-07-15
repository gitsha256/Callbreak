
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
        setSavedGames(JSON.parse(history));
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
          <CardTitle>Saved Games</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full rounded-md border p-2">
            {savedGames.length > 0 ? (
              <div className="flex flex-col gap-2">
                {savedGames.map((game) => (
                  <Button
                    key={game.id}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleViewGame(game.id)}
                  >
                    Game from {new Date(game.timestamp).toLocaleString()}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No saved games found.
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex justify-start">
             <Button onClick={() => router.push('/')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
