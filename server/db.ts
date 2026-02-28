import Database from 'better-sqlite3';

const db = new Database('games.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    publisher TEXT NOT NULL,
    image_url TEXT NOT NULL,
    currency_name TEXT NOT NULL,
    currency_icon TEXT NOT NULL,
    color_theme TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'game'
  );

  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    bonus INTEGER DEFAULT 0,
    price REAL NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
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
    'https://images.igdb.com/igdb/image/upload/t_1080p/co1wyy.jpg',
    'UC',
    'uc-icon',
    '#F59E0B', // Amber
    'game'
  );

  // PUBG Packages (Real Market Prices)
  insertPackage.run('pubg-mobile', 60, 0, 0.99);
  insertPackage.run('pubg-mobile', 300, 25, 4.99);
  insertPackage.run('pubg-mobile', 600, 60, 9.99);
  insertPackage.run('pubg-mobile', 1500, 300, 24.99);
  insertPackage.run('pubg-mobile', 3000, 850, 49.99);
  insertPackage.run('pubg-mobile', 6000, 2100, 99.99);

  // Free Fire
  insertGame.run(
    'free-fire',
    'Free Fire',
    'Garena',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co22j8.jpg',
    'Diamonds',
    'diamond-icon',
    '#EF4444', // Red
    'game'
  );

  // Free Fire Packages (Real Market Prices)
  insertPackage.run('free-fire', 100, 0, 0.99);
  insertPackage.run('free-fire', 210, 21, 2.15);
  insertPackage.run('free-fire', 530, 53, 5.35);
  insertPackage.run('free-fire', 1080, 108, 10.85);
  insertPackage.run('free-fire', 2200, 220, 22.15);
  insertPackage.run('free-fire', 4450, 445, 44.55);
  
  // Mobile Legends
  insertGame.run(
    'mobile-legends',
    'Mobile Legends',
    'Moonton',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co20m0.jpg',
    'Diamonds',
    'diamond-icon',
    '#3B82F6', // Blue
    'game'
  );

  // MLBB Packages (Real Market Prices)
  insertPackage.run('mobile-legends', 78, 8, 1.25);
  insertPackage.run('mobile-legends', 156, 16, 2.50);
  insertPackage.run('mobile-legends', 234, 23, 3.75);
  insertPackage.run('mobile-legends', 390, 39, 6.25);
  insertPackage.run('mobile-legends', 625, 81, 10.00);
  insertPackage.run('mobile-legends', 1860, 335, 30.00);
  insertPackage.run('mobile-legends', 3099, 589, 50.00);

  // Rainbow Six Mobile
  insertGame.run(
    'rainbow-six-mobile',
    'Rainbow Six Mobile',
    'Ubisoft',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co4d97.jpg',
    'R6 Credits',
    'r6-icon',
    '#EAB308', // Yellow
    'game'
  );

  // R6 Mobile Packages
  insertPackage.run('rainbow-six-mobile', 600, 0, 4.99);
  insertPackage.run('rainbow-six-mobile', 1200, 0, 9.99);
  insertPackage.run('rainbow-six-mobile', 2670, 270, 19.99);
  insertPackage.run('rainbow-six-mobile', 4920, 720, 34.99);
  insertPackage.run('rainbow-six-mobile', 7300, 1300, 49.99);
  insertPackage.run('rainbow-six-mobile', 16000, 4000, 99.99);

  // EA SPORTS FC Mobile
  insertGame.run(
    'ea-sports-fc-mobile',
    'EA SPORTS FC Mobile',
    'Electronic Arts',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co6nx7.jpg',
    'FC Points',
    'fc-icon',
    '#10B981', // Emerald
    'game'
  );
  insertPackage.run('ea-sports-fc-mobile', 100, 0, 0.99);
  insertPackage.run('ea-sports-fc-mobile', 500, 50, 4.99);
  insertPackage.run('ea-sports-fc-mobile', 1000, 150, 9.99);

  // Call of Duty: Mobile
  insertGame.run(
    'cod-mobile',
    'Call of Duty: Mobile',
    'Activision',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co20m0.jpg',
    'CP',
    'cp-icon',
    '#6B7280', // Gray
    'game'
  );
  insertPackage.run('cod-mobile', 80, 0, 0.99);
  insertPackage.run('cod-mobile', 400, 20, 4.99);
  insertPackage.run('cod-mobile', 800, 80, 9.99);

  // Arena Breakout
  insertGame.run(
    'arena-breakout',
    'Arena Breakout',
    'Level Infinite',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co6k0j.jpg',
    'Bonds',
    'bond-icon',
    '#F97316', // Orange
    'game'
  );
  insertPackage.run('arena-breakout', 60, 0, 0.99);
  insertPackage.run('arena-breakout', 300, 15, 4.99);

  // League of Legends
  insertGame.run(
    'league-of-legends',
    'League of Legends',
    'Riot Games',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co49wj.jpg',
    'RP',
    'rp-icon',
    '#3B82F6', // Blue
    'game'
  );
  insertPackage.run('league-of-legends', 575, 0, 4.99);
  insertPackage.run('league-of-legends', 1380, 0, 10.99);

  // VALORANT
  insertGame.run(
    'valorant',
    'VALORANT',
    'Riot Games',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co2mvt.jpg',
    'VP',
    'vp-icon',
    '#EF4444', // Red
    'game'
  );
  insertPackage.run('valorant', 475, 0, 4.99);
  insertPackage.run('valorant', 1000, 0, 9.99);

  // TikTok (App Example)
  insertGame.run(
    'tiktok',
    'TikTok',
    'ByteDance',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co5z8n.jpg',
    'Coins',
    'coin-icon',
    '#000000', // Black
    'app'
  );
  insertPackage.run('tiktok', 70, 0, 0.99);
  insertPackage.run('tiktok', 350, 0, 4.99);
  insertPackage.run('tiktok', 700, 0, 9.99);

  // Discord (App Example)
  insertGame.run(
    'discord',
    'Discord',
    'Discord Inc.',
    'https://images.igdb.com/igdb/image/upload/t_1080p/co5z8o.jpg',
    'Nitro',
    'nitro-icon',
    '#5865F2', // Blurple
    'app'
  );
  insertPackage.run('discord', 1, 0, 9.99); // 1 Month Nitro
})();

export default db;
