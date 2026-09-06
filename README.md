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
- **Password-Protected History Deletion**: Safely clear all your saved game history with a password prompt to prevent accidental deletion. "tash"

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

## Building the PWA

This project is configured as a Progressive Web App (PWA) with static export capabilities. Follow these steps to build the application and generate the output folder:

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager

### Build Steps

1. **Don't forget to change directory** to the project folder:
   ```bash
   cd Callbreak
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Build the PWA** with Next.js static export:
   ```bash
   npm run build
   ```

4. Upload the folder to Cloudflare Pages

### Output Folder

After running the build commands, the application will be compiled into the following structure:

- **`.next/` folder**: Contains Next.js build artifacts and optimized production files
- **`out/` folder**: Contains the static HTML, CSS, and JavaScript files for PWA deployment
- **`public/` folder**: Service worker files (`sw.js`) and PWA manifest files are automatically included

### Deployment

The generated `out/` folder contains all the files needed to deploy your PWA:
- Serve the files with any web server (Apache, Nginx, etc.)
- Deploy to static hosting platforms (Vercel, Netlify, GitHub Pages, etc.)
- The service worker will enable offline functionality and app caching

### Development

To run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:9002`

## Court Piece Mode

The application also includes a six-player Court Piece mode with two teams. It supports:

- Team-based round scoring with editable team names.
- Automatic opposing-team zero values when correcting a row entry.
- Race wins when either team reaches 52 points.
- Difference wins when the score gap reaches 52 points.
- A compact win panel showing each team's race requirement, difference requirement, and fastest path.
- Court Piece history, summaries, and loading from saved games.

## Cloudflare Workers Storage

Cloud storage is optional. The application continues to work with browser `localStorage` when Worker URLs are not configured.

1. Copy `.env.example` to `.env.local`.
2. Set the save and load Worker URLs in `.env.local`:

   ```env
   NEXT_PUBLIC_SAVE_GAME_URL=https://your-save-worker.workers.dev
   NEXT_PUBLIC_LOAD_GAME_URL=https://your-load-worker.workers.dev
   ```

3. Follow [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) to configure the KV namespace and deploy both Workers.

Worker deployment commands:

```bash
npm run deploy:save-worker
npm run deploy:load-worker
```

Cloudflare KV game records currently expire after 24 hours. Frequent automatic saves consume KV operations, so review Cloudflare usage before deploying to a large audience.

## GitHub Preparation

Before pushing the project:

- Do not commit `.env.local` or deployment credentials.
- Keep `.env.example` as the safe configuration template.
- Generated Next.js files in `.next/` and local Wrangler files in `.wrangler/` are ignored.
- The `out/` directory is used by the existing static deployment workflow.

Run these checks from the project directory:

```bash
npm run typecheck
npm run build
```

The project contains Court Piece scoring tests under `__tests__/` and Android source under `android/`.
