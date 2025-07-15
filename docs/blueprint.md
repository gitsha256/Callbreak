# **App Name**: Callbreak Companion

## Core Features:

- Score Table UI: Interactive score table with columns for each player and rows for each round (1-13), as well as bid ('Hands') and result ('Rounds') entry. Tapping a cell opens a numeric input.
- Automated Scoring and Ranking: Display total scores and automatically rank players from highest to lowest after each round.
- Game Save/Load: Saves game with timestamp, loads game from history, and deletes game history from local storage. The data is persisted in JSON format.
- Start Time Button: Button to start the timer.
- Track Lagging Score: A field ('Kitna Piche') shows which player is losing in a visible manner.
- Score Reset: Reset the running match score table by setting all scores to zero via dedicated button ('⬆ 0 TO REST').

## Style Guidelines:

- Primary color: Indigo (#4B0082) to capture the intellectual aspects of a game, providing focus to the elements on screen.
- Background color: Light gray (#F0F0F0) to ensure contrast.
- Accent color: Violet (#8F00FF) as a creative visual call to attention.
- Body and headline font: 'Inter' (sans-serif) provides clarity.
- Use icons for game actions: save, load, delete.
- Responsive grid layout adapted for mobile.
- Subtle animations to highlight the current round and updated scores.