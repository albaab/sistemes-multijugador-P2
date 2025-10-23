let idJoc, idJugador;
let jocData = {};

const jugador1 = document.getElementById('jugador1');
const jugador2 = document.getElementById('jugador2');
const textEstat = document.getElementById('estat');
const divJoc = document.getElementById('joc');

// Connectar al servidor del joc
function unirseAlJoc() {
    fetch('game.php?action=join')
        .then(response => response.json())
        .then(data => {
            idJoc = data.game_id;
            idJugador = data.player_id;
            comprovarEstatDelJoc();
            
            // Afegir event listeners per al moviment
            document.addEventListener('keydown', gestionarTecles);
        });
}

// Gestionar les tecles per moure els jugadors
function gestionarTecles(event) {
    if (!idJugador) return;

    const velocitat = 10;
    let nouX, nouY;
    let esJugador1 = false;
    let esJugador2 = false;

    // Determinar quin jugador ets
    if (jocData.player1 === idJugador) {
        esJugador1 = true;
        nouX = parseInt(jugador1.style.left) || 320;
        nouY = parseInt(jugador1.style.top) || 320;
    } else if (jocData.player2 === idJugador) {
        esJugador2 = true;
        nouX = parseInt(jugador2.style.left) || 320;
        nouY = parseInt(jugador2.style.top) || 320;
    } else {
        return; // No ets cap dels jugadors
    }

    // Controls WASD per tots dos jugadors
    switch(event.key) {
        case 'w':
        case 'W':
            nouY = Math.max(0, nouY - velocitat);
            break;
        case 's':
        case 'S':
            nouY = Math.min(600, nouY + velocitat);
            break;
        case 'a':
        case 'A':
            nouX = Math.max(0, nouX - velocitat);
            break;
        case 'd':
        case 'D':
            nouX = Math.min(600, nouX + velocitat);
            break;
        default:
            return;
    }

    // Actualitzar posició localment
    if (esJugador1) {
        jugador1.style.left = nouX + 'px';
        jugador1.style.top = nouY + 'px';
    } else if (esJugador2) {
        jugador2.style.left = nouX + 'px';
        jugador2.style.top = nouY + 'px';
    }

    // Enviar nova posició al servidor
    const playerNum = esJugador1 ? 1 : 2;
    fetch(`game.php?action=move&game_id=${idJoc}&player=${playerNum}&x=${nouX}&y=${nouY}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
            }
        });

    event.preventDefault();
}

// Comprovar l'estat del joc
function comprovarEstatDelJoc() {
    fetch(`game.php?action=status&game_id=${idJoc}`)
        .then(response => response.json())
        .then(joc => {
            if (joc.error) {
                textEstat.innerText = joc.error;
                return;
            }

            jocData = joc;
            
            // Mostrar quin jugador ets
            const rolJugador = document.getElementById('rolJugador');
            if (joc.player1 === idJugador) {
                rolJugador.innerText = 'Ets el Jugador 1 (Quadrat VERMELL) - Usa WASD per moure\'t';
                rolJugador.style.color = 'red';
            } else if (joc.player2 === idJugador) {
                rolJugador.innerText = 'Ets el Jugador 2 (Quadrat BLAU) - Usa WASD per moure\'t';
                rolJugador.style.color = 'blue';
            }

            if (joc.player1 === idJugador) {
                if (joc.player2) {
                    textEstat.innerText = 'Joc en curs... Mou-te amb WASD!';
                    divJoc.style.display = 'block';
                } else {
                    textEstat.innerText = 'Ets el Jugador 1. Esperant el Jugador 2...';
                }
            } else if (joc.player2 === idJugador) {
                textEstat.innerText = 'Joc en curs... Mou-te amb WASD!';
                divJoc.style.display = 'block';
            } else {
                textEstat.innerText = 'Espectant...';
                divJoc.style.display = 'block';
            }

            // Mostrar posicions dels jugadors
            if (joc.player1_pos) {
                jugador1.style.left = joc.player1_pos.x + 'px';
                jugador1.style.top = joc.player1_pos.y + 'px';
                jugador1.style.display = 'block';
            }

            if (joc.player2_pos) {
                jugador2.style.left = joc.player2_pos.x + 'px';
                jugador2.style.top = joc.player2_pos.y + 'px';
                jugador2.style.display = 'block';
            }

            setTimeout(comprovarEstatDelJoc, 100);
        });
}

// Iniciar el joc quan la pàgina estigui carregada
document.addEventListener('DOMContentLoaded', function() {
    unirseAlJoc();
});