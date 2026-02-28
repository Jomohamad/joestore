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
    color_theme TEXT NOT NULL
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
db.exec('DELETE FROM packages; DELETE FROM games;');

const insertGame = db.prepare(`
  INSERT INTO games (id, name, publisher, image_url, currency_name, currency_icon, color_theme)
  VALUES (?, ?, ?, ?, ?, ?, ?)
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
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
    'UC',
    'uc-icon',
    '#F59E0B' // Amber
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
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2165&auto=format&fit=crop',
    'Diamonds',
    'diamond-icon',
    '#EF4444' // Red
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
    'https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=2019&auto=format&fit=crop',
    'Diamonds',
    'diamond-icon',
    '#3B82F6' // Blue
  );

  // MLBB Packages (Real Market Prices)
  insertPackage.run('mobile-legends', 78, 8, 1.25);
  insertPackage.run('mobile-legends', 156, 16, 2.50);
  insertPackage.run('mobile-legends', 234, 23, 3.75);
  insertPackage.run('mobile-legends', 390, 39, 6.25);
  insertPackage.run('mobile-legends', 625, 81, 10.00);
  insertPackage.run('mobile-legends', 1860, 335, 30.00);
  insertPackage.run('mobile-legends', 3099, 589, 50.00);
})();

export default db;
