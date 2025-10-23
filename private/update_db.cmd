@echo off
echo Actualitzant l'esquema de la base de dades...

sqlite3.exe games.db "ALTER TABLE games ADD COLUMN points_player1 INTEGER DEFAULT 0;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN points_player2 INTEGER DEFAULT 0;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN circle_x INTEGER DEFAULT NULL;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN circle_y INTEGER DEFAULT NULL;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN circle_visible INTEGER DEFAULT 0;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN next_circle_time INTEGER DEFAULT NULL;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN player1_x INTEGER DEFAULT 320;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN player1_y INTEGER DEFAULT 320;"
sqlite3.exe games.db "ALTER TABLE games ADD COLUMN winner TEXT DEFAULT NULL;"

echo Esquema actualitzat correctament!
pause