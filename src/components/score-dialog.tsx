
"use client";

import { useState, type ReactNode, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Player } from '@/lib/types';

interface ScoreDialogProps {
  player: Player;
  roundIndex: number;
  currentBid: number | null;
  currentTricks: number | null;
  onSave: (roundIndex: number, playerKey: string, bid: number, tricks: number) => void;
  children: ReactNode;
}

export function ScoreDialog({ player, roundIndex, currentBid, currentTricks, onSave, children }: ScoreDialogProps) {
  const [bid, setBid] = useState(currentBid?.toString() || '');
  const [tricks, setTricks] = useState(currentTricks?.toString() || '');
  const [isOpen, setIsOpen] = useState(false);
  const bidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the first input when the dialog opens
      setTimeout(() => bidInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSave = () => {
    const bidNum = parseInt(bid, 10);
    const tricksNum = parseInt(tricks, 10);

    if (!isNaN(bidNum) && !isNaN(tricksNum) && bidNum >= 1 && bidNum <= 8 && tricksNum >= 0 && tricksNum <= 8) {
      onSave(roundIndex, player.key, bidNum, tricksNum);
      setIsOpen(false);
    } else {
      // Basic validation feedback
      alert("Please enter valid numbers. Bid (1-8), Tricks (0-8).");
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setBid(currentBid?.toString() || '');
      setTricks(currentTricks?.toString() || '');
    }
    setIsOpen(open);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Round {roundIndex + 1}: {player.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bid" className="text-right">Bid</Label>
            <Input
              ref={bidInputRef}
              id="bid"
              type="number"
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 3"
              min="1"
              max="8"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tricks" className="text-right">Tricks Won</Label>
            <Input
              id="tricks"
              type="number"
              value={tricks}
              onChange={(e) => setTricks(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 4"
              min="0"
              max="8"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    