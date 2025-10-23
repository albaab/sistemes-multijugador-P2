<?php
session_start();

// Connectar a la base de dades SQLite
try {
    $db = new PDO('sqlite:../private/games.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Connexió amb la base de dades fallida: ' . $e->getMessage()]);
    exit();
}

$accio = isset($_GET['action']) ? $_GET['action'] : '';

switch ($accio) {
    case 'join':
        if (!isset($_SESSION['player_id'])) {
            $_SESSION['player_id'] = uniqid();
        }

        $player_id = $_SESSION['player_id'];
        $game_id = null;

        // Intentar unir-se a un joc existent on player2 sigui null
        $stmt = $db->prepare('SELECT game_id FROM games WHERE player2 IS NULL LIMIT 1');
        $stmt->execute();
        $joc_existent = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($joc_existent) {
            // Unir-se al joc existent com a player2
            $game_id = $joc_existent['game_id'];
            $stmt = $db->prepare('UPDATE games SET player2 = :player_id, player2_x = 0, player2_y = 0, game_start_time = :start_time WHERE game_id = :game_id');
            $stmt->bindValue(':player_id', $player_id);
            $stmt->bindValue(':game_id', $game_id);
            $stmt->bindValue(':start_time', time());
            $stmt->execute();
        } else {
            // Crear un nou joc com a player1
            $game_id = uniqid();
            $stmt = $db->prepare('INSERT INTO games (game_id, player1, player1_x, player1_y, player2_x, player2_y) VALUES (:game_id, :player_id, 0, 0, 0, 0)');
            $stmt->bindValue(':game_id', $game_id);
            $stmt->bindValue(':player_id', $player_id);
            $stmt->execute();
        }

        echo json_encode(['game_id' => $game_id, 'player_id' => $player_id]);
        break;

    case 'move':
        $game_id = $_GET['game_id'];
        $player_id = $_SESSION['player_id'];
        $player_num = intval($_GET['player']);
        $x = intval($_GET['x']);
        $y = intval($_GET['y']);
        $row = intval($_GET['row']);
        $col = intval($_GET['col']);
        $color = $_GET['color'];

        // Validar que les coordenades estan dins dels límits
        $x = max(0, min(600, $x));
        $y = max(0, min(600, $y));
        $row = max(0, min(15, $row));
        $col = max(0, min(15, $col));

        $stmt = $db->prepare('SELECT player1, player2 FROM games WHERE game_id = :game_id');
        $stmt->bindValue(':game_id', $game_id);
        $stmt->execute();
        $joc = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($joc) {
            if ($player_num === 1 && $joc['player1'] === $player_id) {
                $stmt = $db->prepare('UPDATE games SET player1_x = :x, player1_y = :y WHERE game_id = :game_id');
                $stmt->bindValue(':x', $x);
                $stmt->bindValue(':y', $y);
                $stmt->bindValue(':game_id', $game_id);
                $stmt->execute();
                
                // Guardar casella pintada
                $stmt = $db->prepare('INSERT OR REPLACE INTO painted_cells (game_id, row, col, color) VALUES (:game_id, :row, :col, :color)');
                $stmt->bindValue(':game_id', $game_id);
                $stmt->bindValue(':row', $row);
                $stmt->bindValue(':col', $col);
                $stmt->bindValue(':color', $color);
                $stmt->execute();
                
                echo json_encode(['success' => true]);
            } elseif ($player_num === 2 && $joc['player2'] === $player_id) {
                $stmt = $db->prepare('UPDATE games SET player2_x = :x, player2_y = :y WHERE game_id = :game_id');
                $stmt->bindValue(':x', $x);
                $stmt->bindValue(':y', $y);
                $stmt->bindValue(':game_id', $game_id);
                $stmt->execute();
                
                // Guardar casella pintada
                $stmt = $db->prepare('INSERT OR REPLACE INTO painted_cells (game_id, row, col, color) VALUES (:game_id, :row, :col, :color)');
                $stmt->bindValue(':game_id', $game_id);
                $stmt->bindValue(':row', $row);
                $stmt->bindValue(':col', $col);
                $stmt->bindValue(':color', $color);
                $stmt->execute();
                
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['error' => 'Jugador no autoritzat per moure']);
            }
        } else {
            echo json_encode(['error' => 'Joc no trobat']);
        }
        break;

    case 'status':
        $game_id = $_GET['game_id'];
        $stmt = $db->prepare('SELECT * FROM games WHERE game_id = :game_id');
        $stmt->bindValue(':game_id', $game_id);
        $stmt->execute();
        $joc = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$joc) {
            echo json_encode(['error' => 'Joc no trobat']);
        } else {
            // Comprovar si el joc ha acabat per temps (30 segons)
            $game_started = $joc['player1'] && $joc['player2'] && $joc['game_start_time'];
            $game_ended = false;
            
            if ($game_started && !$joc['game_ended']) {
                $elapsed_time = time() - $joc['game_start_time'];
                if ($elapsed_time >= 30) {
                    // Finalitzar joc automàticament
                    $stmt_end = $db->prepare('UPDATE games SET game_ended = 1 WHERE game_id = :game_id');
                    $stmt_end->bindValue(':game_id', $game_id);
                    $stmt_end->execute();
                    $game_ended = true;
                }
            }
            
            // Obtenir caselles pintades
            $stmt_cells = $db->prepare('SELECT row, col, color FROM painted_cells WHERE game_id = :game_id');
            $stmt_cells->bindValue(':game_id', $game_id);
            $stmt_cells->execute();
            $painted_cells = $stmt_cells->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'player1' => $joc['player1'],
                'player2' => $joc['player2'],
                'player1_pos' => [
                    'x' => $joc['player1_x'],
                    'y' => $joc['player1_y']
                ],
                'player2_pos' => [
                    'x' => $joc['player2_x'],
                    'y' => $joc['player2_y']
                ],
                'painted_cells' => $painted_cells,
                'game_started' => $game_started,
                'game_ended' => $joc['game_ended'] || $game_ended
            ]);
        }
        break;

    case 'endgame':
        $game_id = $_GET['game_id'];
        $winner = $_GET['winner'] ?? 'draw';
        
        $stmt = $db->prepare('UPDATE games SET game_ended = 1, winner = :winner WHERE game_id = :game_id');
        $stmt->bindValue(':game_id', $game_id);
        $stmt->bindValue(':winner', $winner);
        $stmt->execute();
        
        echo json_encode(['success' => true]);
        break;
}
?>
