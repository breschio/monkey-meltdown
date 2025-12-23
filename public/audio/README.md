# Audio Assets

Place your audio files here. Supported formats:
- `.mp3` - Best compatibility
- `.ogg` - Good compression, great for web
- `.wav` - Uncompressed, larger files

## Suggested files:
- `menu-music.mp3` - Start screen / menu background music
- `game-music.mp3` - Main gameplay music
- `victory.mp3` - Level complete jingle

## Usage
Files in `public/` are served at the root path. Access them in code like:
```typescript
const audio = new Audio('/audio/game-music.mp3');
```

