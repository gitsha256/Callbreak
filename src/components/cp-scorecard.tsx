'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CPRoundData, TeamId } from '@/lib/court-piece-types';
import { GameModeSelector } from '@/components/game-mode-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { Clock, Copy, Download, MoreVertical, Redo2, RotateCcw, Share2, Undo2 } from 'lucide-react';

interface CPScorecardProps {
  rounds: CPRoundData[];
  teamNames: Record<TeamId, string>;
  onUpdateTeamName: (team: TeamId, name: string) => void;
  teamATotal: number;
  teamBTotal: number;
  onUpdateRoundEntry: (roundIndex: number, team: TeamId, value: number | null) => void;
  startTime: Date | null;
  gameId: string | null;
  copiedGameId: boolean;
  onCopyGameId: () => void;
  onShareGame: () => void;
  onLoadGame: (gameId: string) => void;
  onSavedGames: () => void;
  onDeleteHistory: (password: string) => boolean;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const displayValue = (value: number | null) => value === null ? '' : value.toString();

export const CPScorecard: React.FC<CPScorecardProps> = ({
  rounds,
  teamNames,
  onUpdateTeamName,
  teamATotal,
  teamBTotal,
  onUpdateRoundEntry,
  startTime,
  gameId,
  copiedGameId,
  onCopyGameId,
  onShareGame,
  onLoadGame,
  onSavedGames,
  onDeleteHistory,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [editingTeam, setEditingTeam] = useState<TeamId | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const [loadGameId, setLoadGameId] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const startTeamNameEdit = (team: TeamId) => {
    setEditingTeam(team);
    setTeamNameDraft(teamNames[team]);
  };

  const saveTeamName = () => {
    if (editingTeam && teamNameDraft.trim()) onUpdateTeamName(editingTeam, teamNameDraft.trim());
    setEditingTeam(null);
  };

  const renderTeamName = (team: TeamId) => editingTeam === team ? (
    <Input autoFocus value={teamNameDraft} onChange={event => setTeamNameDraft(event.target.value)} onBlur={saveTeamName} onKeyDown={event => {
      if (event.key === 'Enter') saveTeamName();
      if (event.key === 'Escape') setEditingTeam(null);
    }} className="h-6 min-w-0 px-1 text-center text-xs" />
  ) : (
    <button type="button" onClick={() => startTeamNameEdit(team)} className="w-full truncate text-center font-bold hover:underline">{teamNames[team]}</button>
  );

  const cellKey = (roundIndex: number, team: TeamId) => `${roundIndex}-${team}`;
  const commitCell = (roundIndex: number, team: TeamId, fallbackValue: number | null) => {
    const key = cellKey(roundIndex, team);
    const rawValue = cellDrafts[key] ?? displayValue(fallbackValue);
    if (rawValue !== '' && rawValue !== '-' && !/^-?\d+$/.test(rawValue)) return;
    onUpdateRoundEntry(roundIndex, team, rawValue === '' || rawValue === '-' ? null : Number(rawValue));
    setCellDrafts(previous => ({ ...previous, [key]: rawValue }));
  };

  const piche = teamATotal === teamBTotal ? 'Tie' : `${teamATotal < teamBTotal ? teamNames.A : teamNames.B} is piche: ${Math.abs(teamATotal - teamBTotal)}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-1 sm:p-2 md:p-4">
      <h1 className="mb-4 text-xl font-bold tracking-tight text-gradient-gold sm:mb-6">TASH PREMIER LEAGUE</h1>
      <Card className="w-full max-w-4xl overflow-hidden rounded-lg border border-primary/20 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-primary/10 bg-gradient-to-r from-card to-card/80 p-2 sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {gameId && <div className="flex items-center gap-2 text-xs sm:text-sm"><span className="font-semibold">Kamra No:</span><span className="truncate font-mono tracking-wider">{gameId}</span></div>}
            <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className="h-8 w-8"><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} aria-label="Redo" className="h-8 w-8"><Redo2 className="h-4 w-4" /></Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Open menu"><MoreVertical /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <GameModeSelector currentMode="courtpiece" />
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><ThemeToggle /></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onCopyGameId}><Copy className="mr-2 h-4 w-4" />{copiedGameId ? 'Copied!' : 'Copy Kamra No.'}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onShareGame}><Share2 className="mr-2 h-4 w-4" />Share Game</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onSavedGames}><Clock className="mr-2 h-4 w-4" />Saved Games</DropdownMenuItem>
              <DropdownMenuItem onSelect={event => event.preventDefault()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild><div className="flex w-full items-center"><Download className="mr-2 h-4 w-4" />Load Game</div></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Load Game</AlertDialogTitle><AlertDialogDescription>Enter the Kamra No. to load a shared game.</AlertDialogDescription><div className="space-y-2 pt-2"><Label htmlFor="cp-load-game-id">Kamra No.</Label><Input id="cp-load-game-id" value={loadGameId} onChange={event => setLoadGameId(event.target.value)} maxLength={4} /></div></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={() => setLoadGameId('')}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { onLoadGame(loadGameId.trim()); setLoadGameId(''); }}>Load Game</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={event => event.preventDefault()} className="text-destructive"><RotateCcw className="mr-2 h-4 w-4" />Delete History</DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete saved games. Enter the password to proceed.</AlertDialogDescription><div className="space-y-2 pt-2"><Label htmlFor="cp-delete-password">Password</Label><Input id="cp-delete-password" type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} /></div></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel><AlertDialogAction onClick={event => { if (!onDeleteHistory(deletePassword)) event.preventDefault(); else setDeletePassword(''); }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-lg">
            <Table className="min-w-[230px] table-fixed border-collapse">
              <TableHeader><TableRow><TableHead className="w-[30px] border-r p-1 text-center text-xs font-bold sm:w-[42px]">R</TableHead><TableHead className="border-r bg-blue-500/10 p-1 text-center text-xs sm:text-sm">{renderTeamName('A')}</TableHead><TableHead className="bg-red-500/10 p-1 text-center text-xs sm:text-sm">{renderTeamName('B')}</TableHead></TableRow></TableHeader>
              <TableBody>{rounds.map((round, roundIndex) => { const teamAKey = cellKey(roundIndex, 'A'); const teamBKey = cellKey(roundIndex, 'B'); const teamAClass = round.teamAScore !== null ? round.teamAScore < 0 ? 'bg-red-500/25' : 'bg-green-500/25' : ''; const teamBClass = round.teamBScore !== null ? round.teamBScore < 0 ? 'bg-red-500/25' : 'bg-green-500/25' : ''; return <TableRow key={`${round.roundNumber}-${roundIndex}`} className="hover:bg-primary/5"><TableCell className="border-r p-1 text-center text-xs font-semibold sm:text-sm">{round.roundNumber}</TableCell><TableCell className={`border-r p-0 ${teamAClass}`}><Input aria-label={`${teamNames.A} round ${round.roundNumber}`} type="text" inputMode="numeric" value={cellDrafts[teamAKey] ?? displayValue(round.teamAScore)} onChange={event => { if (/^-?\d*$/.test(event.target.value)) setCellDrafts(previous => ({ ...previous, [teamAKey]: event.target.value })); }} onBlur={() => commitCell(roundIndex, 'A', round.teamAScore)} onKeyDown={event => event.key === 'Enter' && commitCell(roundIndex, 'A', round.teamAScore)} className="h-9 w-full min-w-0 rounded-none border-0 bg-transparent px-1 text-center text-sm font-bold focus-visible:ring-1" /></TableCell><TableCell className={`p-0 ${teamBClass}`}><Input aria-label={`${teamNames.B} round ${round.roundNumber}`} type="text" inputMode="numeric" value={cellDrafts[teamBKey] ?? displayValue(round.teamBScore)} onChange={event => { if (/^-?\d*$/.test(event.target.value)) setCellDrafts(previous => ({ ...previous, [teamBKey]: event.target.value })); }} onBlur={() => commitCell(roundIndex, 'B', round.teamBScore)} onKeyDown={event => event.key === 'Enter' && commitCell(roundIndex, 'B', round.teamBScore)} className="h-9 w-full min-w-0 rounded-none border-0 bg-transparent px-1 text-center text-sm font-bold focus-visible:ring-1" /></TableCell></TableRow>; })}</TableBody>
              <tfoot className="border-t-2 border-primary"><TableRow><TableCell className="border-r p-1 text-center text-[10px] font-bold sm:text-xs">Total</TableCell><TableCell className="border-r bg-blue-500/10 p-1 text-center text-base font-bold text-blue-600 sm:text-lg">{teamATotal}</TableCell><TableCell className="bg-red-500/10 p-1 text-center text-base font-bold text-red-600 sm:text-lg">{teamBTotal}</TableCell></TableRow></tfoot>
            </Table>
            <div className="flex items-center justify-center border-t-2 border-primary bg-gradient-to-r from-red-500/10 to-orange-500/10 p-3"><span className="text-base font-bold text-red-600 sm:text-lg">{piche}</span></div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t border-primary/10 bg-gradient-to-r from-muted/50 to-muted/30 p-2">
          {startTime && <Button size="sm" variant="outline" className="mr-auto h-8 cursor-default px-2 text-xs hover:bg-transparent"><Clock className="mr-2 h-3 w-3" />{new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Button>}
          <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="destructive"><RotateCcw className="mr-1 h-4 w-4" />Clear</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Clear Game?</AlertDialogTitle><AlertDialogDescription>This will save the current game and clear all scores to zero. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onClear}>Clear</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </CardFooter>
      </Card>
    </main>
  );
};
