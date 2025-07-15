"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, SavedGame } from '@/lib/types';
import { Upload } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface LoadGameDialogProps {
  onGameLoad: (gameState: GameState) => void;
}

export function LoadGameDialog({ onGameLoad }: LoadGameDialogProps) {
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  const handleLoad = (game: SavedGame) => {
    onGameLoad(game.gameState);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Upload className="mr-2 h-4 w-4" /> Load Game
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load Saved Game</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-2">
          {savedGames.length > 0 ? (
            <div className="flex flex-col gap-2">
              {savedGames.map((game) => (
                <Button
                  key={game.id}
                  variant="ghost"
                  className="justify-start"
                  onClick={() => handleLoad(game)}
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
      </DialogContent>
    </Dialog>
  );
}
