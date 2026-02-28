import Database from 'better-sqlite3';

const db = new Database('games.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS packages;
  DROP TABLE IF EXISTS games;

  CREATE TABLE games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    publisher TEXT NOT NULL,
    image_url TEXT NOT NULL,
    currency_name TEXT NOT NULL,
    currency_icon TEXT NOT NULL,
    color_theme TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'game'
  );

  CREATE TABLE packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    bonus INTEGER DEFAULT 0,
    price REAL NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id)
  );

  CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    package_id INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (package_id) REFERENCES packages(id)
  );
`);

// Seed initial data if empty or force re-seed for updates
// Disable foreign keys temporarily for deletion
db.pragma('foreign_keys = OFF');
db.exec('DELETE FROM packages; DELETE FROM games;');
db.pragma('foreign_keys = ON');

const insertGame = db.prepare(`
  INSERT INTO games (id, name, publisher, image_url, currency_name, currency_icon, color_theme, category)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertPackage = db.prepare(`
  INSERT INTO packages (game_id, amount, bonus, price)
  VALUES (?, ?, ?, ?)
`);

db.transaction(() => {
  // PUBG Mobile
  insertGame.run(
    'pubg-mobile',
    'PUBG Mobile',
    'Level Infinite',
    '/pics/pubg.svg',
    'UC',
    'uc-icon',
    '#F59E0B', // Amber
    'game'
  );

  // PUBG Packages (Real Market Prices in EGP)
  insertPackage.run('pubg-mobile', 60, 0, 50);
  insertPackage.run('pubg-mobile', 300, 25, 250);
  insertPackage.run('pubg-mobile', 600, 60, 500);
  insertPackage.run('pubg-mobile', 1500, 300, 1250);
  insertPackage.run('pubg-mobile', 3000, 850, 2500);
  insertPackage.run('pubg-mobile', 6000, 2100, 5000);

  // Free Fire
  insertGame.run(
    'free-fire',
    'Free Fire',
    'Garena',
    '/pics/freefire.svg',
    'Diamonds',
    'diamond-icon',
    '#EF4444', // Red
    'game'
  );

  // Free Fire Packages (Real Market Prices in EGP)
  insertPackage.run('free-fire', 100, 0, 50);
  insertPackage.run('free-fire', 210, 21, 105);
  insertPackage.run('free-fire', 530, 53, 265);
  insertPackage.run('free-fire', 1080, 108, 540);
  insertPackage.run('free-fire', 2200, 220, 1100);
  insertPackage.run('free-fire', 4450, 445, 2225);
  
  // Mobile Legends
  insertGame.run(
    'mobile-legends',
    'Mobile Legends',
    'Moonton',
    '/pics/mlbb.svg',
    'Diamonds',
    'diamond-icon',
    '#3B82F6', // Blue
    'game'
  );

  // MLBB Packages (Real Market Prices in EGP)
  insertPackage.run('mobile-legends', 78, 8, 60);
  insertPackage.run('mobile-legends', 156, 16, 125);
  insertPackage.run('mobile-legends', 234, 23, 185);
  insertPackage.run('mobile-legends', 390, 39, 310);
  insertPackage.run('mobile-legends', 625, 81, 500);
  insertPackage.run('mobile-legends', 1860, 335, 1500);
  insertPackage.run('mobile-legends', 3099, 589, 2500);

  // Rainbow Six Mobile
  insertGame.run(
    'rainbow-six-mobile',
    'Rainbow Six Mobile',
    'Ubisoft',
    '/pics/rainbow.svg',
    'R6 Credits',
    'r6-icon',
    '#EAB308', // Yellow
    'game'
  );

  // R6 Mobile Packages
  insertPackage.run('rainbow-six-mobile', 600, 0, 250);
  insertPackage.run('rainbow-six-mobile', 1200, 0, 500);
  insertPackage.run('rainbow-six-mobile', 2670, 270, 1000);
  insertPackage.run('rainbow-six-mobile', 4920, 720, 1750);
  insertPackage.run('rainbow-six-mobile', 7300, 1300, 2500);
  insertPackage.run('rainbow-six-mobile', 16000, 4000, 5000);

  // EA SPORTS FC Mobile
  insertGame.run(
    'ea-sports-fc-mobile',
    'EA SPORTS FC Mobile',
    'Electronic Arts',
    '/pics/codm.svg', // using codm placeholder as generic
    'FC Points',
    'fc-icon',
    '#10B981', // Emerald
    'game'
  );
  insertPackage.run('ea-sports-fc-mobile', 100, 0, 50);
  insertPackage.run('ea-sports-fc-mobile', 500, 50, 250);
  insertPackage.run('ea-sports-fc-mobile', 1000, 150, 500);

  // Call of Duty: Mobile
  insertGame.run(
    'cod-mobile',
    'Call of Duty: Mobile',
    'Activision',
    '/pics/codm.svg',
    'CP',
    'cp-icon',
    '#6B7280', // Gray
    'game'
  );
  insertPackage.run('cod-mobile', 80, 0, 50);
  insertPackage.run('cod-mobile', 400, 20, 250);
  insertPackage.run('cod-mobile', 800, 80, 500);

  // Arena Breakout
  insertGame.run(
    'arena-breakout',
    'Arena Breakout',
    'Level Infinite',
    '/pics/roblox.svg', // generic
    'Bonds',
    'bond-icon',
    '#F97316', // Orange
    'game'
  );
  insertPackage.run('arena-breakout', 60, 0, 50);
  insertPackage.run('arena-breakout', 300, 15, 250);

  // League of Legends
  insertGame.run(
    'league-of-legends',
    'League of Legends',
    'Riot Games',
    '/pics/genshin.svg', // generic
    'RP',
    'rp-icon',
    '#3B82F6', // Blue
    'game'
  );
  insertPackage.run('league-of-legends', 575, 0, 250);
  insertPackage.run('league-of-legends', 1380, 0, 550);

  // VALORANT
  insertGame.run(
    'valorant',
    'VALORANT',
    'Riot Games',
    '/pics/valorant.svg',
    'VP',
    'vp-icon',
    '#EF4444', // Red
    'game'
  );
  insertPackage.run('valorant', 475, 0, 250);
  insertPackage.run('valorant', 1000, 0, 500);

  // TikTok (App Example)
  insertGame.run(
    'tiktok',
    'TikTok',
    'ByteDance',
    '/pics/pubg.svg', // generic
    'Coins',
    'coin-icon',
    '#000000', // Black
    'app'
  );
  insertPackage.run('tiktok', 70, 0, 50);
  insertPackage.run('tiktok', 350, 0, 250);
  insertPackage.run('tiktok', 700, 0, 500);

  // Discord (App Example)
  insertGame.run(
    'discord',
    'Discord',
    'Discord Inc.',
    '/pics/steam.svg', // generic
    'Nitro',
    'nitro-icon',
    '#5865F2', // Blurple
    'app'
  );
  insertPackage.run('discord', 1, 0, 500); // 1 Month Nitro
  // Steam
  insertGame.run(
    'steam',
    'Steam',
    'Valve',
    '/pics/steam.svg',
    'Wallet Code',
    'steam-icon',
    '#171A21', // Dark Blue
    'app'
  );
  insertPackage.run('steam', 5, 0, 250);
  insertPackage.run('steam', 10, 0, 500);
  insertPackage.run('steam', 20, 0, 1000);
  insertPackage.run('steam', 50, 0, 2500);
  insertPackage.run('steam', 100, 0, 5000);

  // Google Play
  insertGame.run(
    'google-play',
    'Google Play',
    'Google',
    '/pics/googleplay.svg',
    'Gift Card',
    'google-play-icon',
    '#34A853', // Green
    'app'
  );
  insertPackage.run('google-play', 5, 0, 250);
  insertPackage.run('google-play', 10, 0, 500);
  insertPackage.run('google-play', 25, 0, 1250);
  insertPackage.run('google-play', 50, 0, 2500);
  insertPackage.run('google-play', 100, 0, 5000);

  // App Store
  insertGame.run(
    'app-store',
    'App Store & iTunes',
    'Apple',
    '/pics/appstore.svg',
    'Gift Card',
    'app-store-icon',
    '#007AFF', // Blue
    'app'
  );
  insertPackage.run('app-store', 5, 0, 250);
  insertPackage.run('app-store', 10, 0, 500);
  insertPackage.run('app-store', 25, 0, 1250);
  insertPackage.run('app-store', 50, 0, 2500);
  insertPackage.run('app-store', 100, 0, 5000);
})();

export default db;
