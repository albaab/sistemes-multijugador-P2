sqlite3 games.db "DROP TABLE IF EXISTS games; CREATE TABLE games (game_id TEXT PRIMARY KEY, player1 TEXT, player2 TEXT, player1_x INTEGER DEFAULT 0, player1_y INTEGER DEFAULT 0, player2_x INTEGER DEFAULT 0, player2_y INTEGER DEFAULT 0, game_start_time INTEGER DEFAULT NULL, game_ended INTEGER DEFAULT 0, winner TEXT DEFAULT NULL);"

sqlite3 games.db "CREATE TABLE IF NOT EXISTS painted_cells (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT, row INTEGER, col INTEGER, color TEXT, FOREIGN KEY(game_id) REFERENCES games(game_id));"
