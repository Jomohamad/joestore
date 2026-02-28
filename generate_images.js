import fs from 'fs';
import path from 'path';

const picsDir = path.join(process.cwd(), 'public', 'pics');
if (!fs.existsSync(picsDir)) {
  fs.mkdirSync(picsDir, { recursive: true });
}

const games = [
  { id: 'pubg', name: 'PUBG Mobile', color: '#F59E0B' },
  { id: 'freefire', name: 'Free Fire', color: '#EF4444' },
  { id: 'valorant', name: 'Valorant', color: '#EF4444' },
  { id: 'roblox', name: 'Roblox', color: '#10B981' },
  { id: 'genshin', name: 'Genshin Impact', color: '#3B82F6' },
  { id: 'mlbb', name: 'Mobile Legends', color: '#8B5CF6' },
  { id: 'codm', name: 'Call of Duty Mobile', color: '#6B7280' },
  { id: 'rainbow', name: 'Rainbow Six Mobile', color: '#14B8A6' },
  { id: 'steam', name: 'Steam', color: '#1E3A8A' },
  { id: 'googleplay', name: 'Google Play', color: '#10B981' },
  { id: 'appstore', name: 'App Store', color: '#3B82F6' },
];

games.forEach(game => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect width="400" height="500" fill="#111111" />
  <rect x="20" y="20" width="360" height="460" fill="none" stroke="${game.color}" stroke-width="4" rx="20" />
  <circle cx="200" cy="200" r="80" fill="${game.color}" opacity="0.2" />
  <text x="200" y="210" font-family="sans-serif" font-size="60" font-weight="bold" fill="${game.color}" text-anchor="middle">${game.name.charAt(0)}</text>
  <text x="200" y="350" font-family="sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${game.name}</text>
</svg>`;
  
  fs.writeFileSync(path.join(picsDir, `${game.id}.svg`), svg);
});

console.log('Images generated successfully in public/pics/');
