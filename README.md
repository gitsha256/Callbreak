# Tash Premier League - Callbreak Scorekeeper

This is a web-based scorekeeping application designed specifically for the popular card game, Callbreak. It provides an intuitive and dynamic interface to track scores, manage game history, and enhance the gaming experience for up to four players. The application is designed to be responsive and works seamlessly on both desktop and mobile devices.

## Key Features

- **Dynamic Scoreboard**: An interactive table where you can track scores for each player across multiple rounds.
- **In-place Editing**: Easily edit player names and round scores directly within the table cells by clicking on them.
- **Real-time Calculations**:
    - **Total Scores**: Automatically calculates and displays the total score for each player. Single-digit scores are not included in the final total.
    - **Player Ranking**: Ranks players from 1st to 4th based on their current total scores.
    - **Piche Calculation**: Displays the "Piche" value, calculated as the score difference between the 3rd and 4th place players.
    - **Hand Value**: A special "H" column sums the digits of positive scores in each round (e.g., a score of 13 contributes 1+3=4).
- **Persistent State**: The current game state is automatically saved to your browser's local storage, so you can close the tab and resume your game later.
- **Undo/Redo**: Made a mistake? Easily undo and redo your actions with dedicated buttons.
- **Game History**:
    - **Save and Clear**: When a game is over, the "Clear" button archives the current game and starts a new one with the same players.
    - **Saved Games Page**: A dedicated page lists all previously saved games with timestamps.
    - **Game Summary**: View a detailed summary of any past game.
    - **Load Game**: You can load any game from your history back onto the main scoreboard to view or continue it.
- **Theme Toggle**: Switch between a visually appealing dark mode (with a shimmering golden title) and a clean light mode.
- **Password-Protected History Deletion**: Safely clear all your saved game history with a password prompt to prevent accidental deletion.

## Tech Stack

This application is built with a modern, robust, and scalable tech stack:

- **Framework**: [Next.js](https://nextjs.org/) (utilizing the App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [React](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/) for a set of beautiful and accessible components.
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks (`useState`, `useEffect`, `useMemo`) for local component state and managing game logic.
- **Data Persistence**: Browser's `localStorage` API is used to save game state and history.
