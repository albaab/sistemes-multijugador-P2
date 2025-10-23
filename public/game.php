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
            $stmt = $db->prepare('UPDATE games SET player2 = :player_id WHERE game_id = :game_id');
            $stmt->bindValue(':player_id', $player_id);
            $stmt->bindValue(':game_id', $game_id);
            $stmt->execute();
        } else {
            // Crear un nou joc com a player1
            $game_id = uniqid();
            $stmt = $db->prepare('INSERT INTO games (game_id, player1, player1_x, player1_y) VALUES (:game_id, :player_id, 320, 320)');
            $stmt->bindValue(':game_id', $game_id);
            $stmt->bindValue(':player_id', $player_id);
            $stmt->execute();
        }

        echo json_encode(['game_id' => $game_id, 'player_id' => $player_id]);
        break;

    case 'move':
        $game_id = $_GET['game_id'];
        $player_id = $_SESSION['player_id'];
        $x = intval($_GET['x']);
        $y = intval($_GET['y']);

        // Validar que les coordenades estan dins dels límits
        $x = max(0, min(600, $x));
        $y = max(0, min(600, $y));

        $stmt = $db->prepare('SELECT player1 FROM games WHERE game_id = :game_id');
        $stmt->bindValue(':game_id', $game_id);
        $stmt->execute();
        $joc = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($joc && $joc['player1'] === $player_id) {
            $stmt = $db->prepare('UPDATE games SET player1_x = :x, player1_y = :y WHERE game_id = :game_id');
            $stmt->bindValue(':x', $x);
            $stmt->bindValue(':y', $y);
            $stmt->bindValue(':game_id', $game_id);
            $stmt->execute();
            
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Jugador no autoritzat per moure']);
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
            // Comprovar si cal generar un nou cercle
            if ($joc['player1'] && $joc['player2'] && !$joc['winner']) {
                $temps_actual = time();
                if (!$joc['circle_visible'] && ($joc['next_circle_time'] === null || $temps_actual >= $joc['next_circle_time'])) {
                    // Generar una nova posició per al cercle
                    $maxX = 590; // Amplada de l'àrea de joc (640px) - amplada del cercle (50px)
                    $maxY = 590; // Alçada de l'àrea de joc (640px) - alçada del cercle (50px)
                    $circle_x = rand(0, $maxX);
                    $circle_y = rand(0, $maxY);

                    // Actualitzar la posició del cercle i la visibilitat a la base de dades
                    $stmt_update = $db->prepare('UPDATE games SET circle_x = :circle_x, circle_y = :circle_y, circle_visible = 1 WHERE game_id = :game_id');
                    $stmt_update->bindValue(':circle_x', $circle_x);
                    $stmt_update->bindValue(':circle_y', $circle_y);
                    $stmt_update->bindValue(':game_id', $game_id);
                    $stmt_update->execute();

                    // Actualitzar l'objecte joc
                    $joc['circle_x'] = $circle_x;
                    $joc['circle_y'] = $circle_y;
                    $joc['circle_visible'] = 1;
                }
            }

            echo json_encode([
                'player1' => $joc['player1'],
                'player2' => $joc['player2'],
                'points' => [$joc['points_player1'], $joc['points_player2']],
                'winner' => $joc['winner'],
                'player1_pos' => [
                    'x' => $joc['player1_x'],
                    'y' => $joc['player1_y']
                ],
                'circle' => [
                    'x' => $joc['circle_x'],
                    'y' => $joc['circle_y'],
                    'visible' => $joc['circle_visible']
                ]
            ]);
        }
        break;

    case 'click':
        $game_id = $_GET['game_id'];
        $player_id = $_SESSION['player_id'];

        $stmt = $db->prepare('SELECT * FROM games WHERE game_id = :game_id');
        $stmt->bindValue(':game_id', $game_id);
        $stmt->execute();
        $joc = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$joc || $joc['winner']) {
            echo json_encode(['error' => 'Joc finalitzat o no trobat']);
            break;
        }

        if (!$joc['circle_visible']) {
            echo json_encode(['error' => 'No hi ha cap cercle per fer clic']);
            break;
        }

        // Només el Jugador 2 pot fer clic als cercles
        if ($joc['player2'] !== $player_id) {
            echo json_encode(['error' => 'Només el Jugador 2 pot fer clic als cercles']);
            break;
        }

        // Comprovar si algú ja ha fet clic al cercle
        if ($joc['next_circle_time'] !== null && $joc['next_circle_time'] > time()) {
            echo json_encode(['error' => 'El cercle ja ha estat clicat']);
            break;
        }

        // Actualitzar punts del Jugador 2
        $stmt = $db->prepare('UPDATE games SET points_player2 = points_player2 + 1 WHERE game_id = :game_id');
        $stmt->bindValue(':game_id', $game_id);
        $stmt->execute();
        $joc['points_player2'] += 1;

        // Amagar el cercle i establir el temps per al següent cercle
        $retard = rand(1, 4); // El següent cercle apareix després de 1 a 4 segons
        $next_circle_time = time() + $retard;
        $stmt = $db->prepare('UPDATE games SET circle_visible = 0, next_circle_time = :next_circle_time WHERE game_id = :game_id');
        $stmt->bindValue(':next_circle_time', $next_circle_time);
        $stmt->bindValue(':game_id', $game_id);
        $stmt->execute();

        // Comprovar si hi ha un guanyador
        if ($joc['points_player2'] >= 10) {
            $stmt = $db->prepare('UPDATE games SET winner = :player_id WHERE game_id = :game_id');
            $stmt->bindValue(':player_id', $joc['player2']);
            $stmt->bindValue(':game_id', $game_id);
            $stmt->execute();
        }

        echo json_encode(['success' => true]);
        break;
}
?>
