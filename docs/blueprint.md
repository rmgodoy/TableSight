# **App Name**: Tabletop Alchemist

## Core Features:

- Dual-Screen Support: Provide dual-screen support, where one screen is for the GM and another for the players, displaying a synchronized player view.
- Tile-Based Map Editor: Provide a tile-based map drawing tool where the GM can draw the map, upload tile sets, configure tile sets, and utilize a Godot-like auto-tiling feature. Map layers should include base terrain and walls.
- Fog of War & FOV: The app manages dynamic fog of war that reveals with player token movement. Field of view is based on token line of sight and map obstructions, showing visible areas on the player screen with an option to keep previously seen areas dimmed.
- Token Management: Enable control and management of two types of tokens, PCs and enemies. This includes movement, setting FOV radius and shape, toggling visibility, and dynamic fog of war clearing.
- Real-Time Synchronization: All map edits, token movements, and fog of war changes synchronize in real-time between the GM and player screens.
- Undo/Redo Functionality: Provide simple 'undo' and 'redo' functionality for map drawing and token placement.
- Save/Load Maps: Ability to save and load maps with token layouts, allowing GMs to quickly set up and continue their games.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) for a mystical and strategic feel, reminiscent of arcane arts.
- Background color: Dark gray (#303030) for a low-distraction, immersive environment.
- Accent color: Bright green (#4CAF50) to highlight interactive elements and token visibility.
- Body and headline font: 'Inter', a sans-serif font for a clean and modern interface. 
- Use minimalist icons for actions and controls, making them easily recognizable without being obtrusive.
- Maintain a clean and minimal interface, focusing on the map and token display while providing essential GM controls. Keep the interface uncluttered during play.
- Use subtle, non-distracting animations to indicate state changes, such as token movements and fog of war clearing.