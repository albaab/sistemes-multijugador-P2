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
            $stmt = $db->prepare('UPDATE games SET player2 = :player_id, player2_x = 320, player2_y = 320 WHERE game_id = :game_id');
            $stmt->bindValue(':player_id', $player_id);
            $stmt->bindValue(':game_id', $game_id);
            $stmt->execute();
        } else {
            // Crear un nou joc com a player1
            $game_id = uniqid();
            $stmt = $db->prepare('INSERT INTO games (game_id, player1, player1_x, player1_y, player2_x, player2_y) VALUES (:game_id, :player_id, 320, 320, 320, 320)');
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

        // Validar que les coordenades estan dins dels límits
        $x = max(0, min(600, $x));
        $y = max(0, min(600, $y));

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
                echo json_encode(['success' => true]);
            } elseif ($player_num === 2 && $joc['player2'] === $player_id) {
                $stmt = $db->prepare('UPDATE games SET player2_x = :x, player2_y = :y WHERE game_id = :game_id');
                $stmt->bindValue(':x', $x);
                $stmt->bindValue(':y', $y);
                $stmt->bindValue(':game_id', $game_id);
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
                ]
            ]);
        }
        break;
}
?>
