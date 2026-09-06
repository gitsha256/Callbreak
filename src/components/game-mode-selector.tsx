/**
 * Game Mode Selector Component
 * Toggle between Call Break and Court Piece modes
 * 
 * NOTE: This component returns only the menu items (DropdownMenuItem + DropdownMenuSeparator)
 * It must be used inside a DropdownMenuContent element
 */

'use client';

import React from 'react';
import Link from 'next/link';
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
  const modes = [
    {
      id: 'callbreak',
      name: 'Call Break',
      description: '4-Player Standard Game',
      icon: Gamepad2,
      href: '/',
    },
    {
      id: 'courtpiece',
      name: 'Court Piece',
      description: '6-Player Team Game',
      icon: Users,
      href: '/court-piece',
    },
  ];

  return (
    <>
      {modes.map(mode => {
        const Icon = mode.icon;
        const isActive = mode.id === currentMode;

        return (
          <React.Fragment key={mode.id}>
            <DropdownMenuItem
              asChild
              className={isActive ? 'bg-accent' : ''}
            >
              <Link
                href={mode.href}
                className="flex items-start gap-3 py-3 px-4 cursor-pointer"
                onClick={() => onModeChange?.(mode.id as GameMode)}
              >
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{mode.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {mode.description}
                  </span>
                </div>
                {isActive && (
                  <span className="ml-auto text-xs font-semibold text-green-600">
                    Active
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
            {mode.id !== modes[modes.length - 1].id && <DropdownMenuSeparator />}
          </React.Fragment>
        );
      })}
    </>
  );
};
