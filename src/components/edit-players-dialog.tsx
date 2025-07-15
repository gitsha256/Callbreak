"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Player } from '@/lib/types';
import { Pencil } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface EditPlayersDialogProps {
  players: Player[];
  onSave: (players: Player[]) => void;
}

export function EditPlayersDialog({ players, onSave }: EditPlayersDialogProps) {
  const [playerNames, setPlayerNames] = useState(players.map(p => p.name));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlayerNames(players.map(p => p.name));
    }
  }, [isOpen, players]);

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleSave = () => {
    const updatedPlayers = players.map((player, index) => ({
      ...player,
      name: playerNames[index] || `Player ${index + 1}`
    }));
    onSave(updatedPlayers);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Players
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Player Names</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {playerNames.map((name, index) => (
            <div key={players[index].key} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`player-${index}`} className="text-right">
                Player {index + 1}
              </Label>
              <Input
                id={`player-${index}`}
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                className="col-span-3"
                placeholder={`Enter name`}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
