/**
 * Game Mode Selector Component
 * Toggle between Call Break and Court Piece modes
 * 
 * NOTE: This component returns only the menu items (DropdownMenuItem + DropdownMenuSeparator)
 * It must be used inside a DropdownMenuContent element
 */

'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Gamepad2, Users } from 'lucide-react';

export type GameMode = 'callbreak' | 'courtpiece';

interface GameModeSelectorProps {
  currentMode: GameMode;
  onModeChange?: (mode: GameMode) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  currentMode,
  onModeChange,
}) => {
  const router = useRouter();
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const modes = [
    {
      id: 'callbreak',
      name: 'CallBreak',
      icon: Gamepad2,
    },
    {
      id: 'courtpiece',
      name: '52',
      icon: Users,
    },
  ];

  return (
    <>
      {modes.map(mode => {
        const Icon = mode.icon;
        const isActive = mode.id === currentMode;

        const selectMode = () => {
          if (isActive) return;
          setPendingMode(mode.id as GameMode);
        };

        return (
          <React.Fragment key={mode.id}>
            <DropdownMenuItem
              className={isActive ? 'bg-accent' : ''}
              onSelect={(event) => {
                event.preventDefault();
                selectMode();
              }}
            >
              <div className="flex items-start gap-3 py-3 px-4 cursor-pointer">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{mode.name}</span>
                {isActive && (
                  <span
                    className="ml-auto h-2 w-2 rounded-full bg-green-500"
                    aria-label="Active"
                    title="Active"
                  />
                )}
              </div>
            </DropdownMenuItem>
            {mode.id !== modes[modes.length - 1].id && <DropdownMenuSeparator />}
          </React.Fragment>
        );
      })}
      <AlertDialog open={pendingMode !== null} onOpenChange={(open) => !open && setPendingMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch game mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Save this as your default mode so the app opens here next time?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMode(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                if (!pendingMode) return;
                onModeChange?.(pendingMode);
                router.push(pendingMode === 'courtpiece' ? '/court-piece' : '/');
                setPendingMode(null);
              }}
            >
              Don't save
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (!pendingMode) return;
                localStorage.setItem('default-game-mode', pendingMode);
                onModeChange?.(pendingMode);
                router.push(pendingMode === 'courtpiece' ? '/court-piece' : '/');
                setPendingMode(null);
              }}
            >
              Save and switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
