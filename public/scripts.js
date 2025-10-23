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
            document.addEventListener('keyup', gestionarTeclesUp);
        });
}

// Variables per gestionar efectes visuals
let teclesPremudes = new Set();

// Gestionar les tecles per moure els jugadors
function gestionarTecles(event) {
    if (!idJugador || teclesPremudes.has(event.key)) return;

    const velocitat = 10;
    let nouX, nouY;
    let esJugador1 = false;
    let esJugador2 = false;
    let jugadorElement;

    // Determinar quin jugador ets
    if (jocData.player1 === idJugador) {
        esJugador1 = true;
        jugadorElement = jugador1;
        nouX = parseInt(jugador1.style.left) || 320;
        nouY = parseInt(jugador1.style.top) || 320;
    } else if (jocData.player2 === idJugador) {
        esJugador2 = true;
        jugadorElement = jugador2;
        nouX = parseInt(jugador2.style.left) || 320;
        nouY = parseInt(jugador2.style.top) || 320;
    } else {
        return; // No ets cap dels jugadors
    }

    // Controls WASD per tots dos jugadors
    let moved = false;
    switch(event.key.toLowerCase()) {
        case 'w':
            nouY = Math.max(0, nouY - velocitat);
            moved = true;
            break;
        case 's':
            nouY = Math.min(590, nouY + velocitat); // 640 - 50 (mida del jugador)
            moved = true;
            break;
        case 'a':
            nouX = Math.max(0, nouX - velocitat);
            moved = true;
            break;
        case 'd':
            nouX = Math.min(590, nouX + velocitat); // 640 - 50 (mida del jugador)
            moved = true;
            break;
        default:
            return;
    }

    if (moved) {
        // Efecte visual de pressió de tecla
        jugadorElement.classList.add('key-pressed');
        teclesPremudes.add(event.key);

        // Actualitzar posició localment amb transició suau
        jugadorElement.style.left = nouX + 'px';
        jugadorElement.style.top = nouY + 'px';

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
}

// Gestionar quan es deixa anar la tecla
function gestionarTeclesUp(event) {
    const jugadorElement = jocData.player1 === idJugador ? jugador1 : jugador2;
    jugadorElement.classList.remove('key-pressed');
    teclesPremudes.delete(event.key);
}

// Comprovar l'estat del joc
function comprovarEstatDelJoc() {
    fetch(`game.php?action=status&game_id=${idJoc}`)
        .then(response => response.json())
        .then(joc => {
            if (joc.error) {
                textEstat.innerHTML = `❌ ${joc.error}`;
                return;
            }

            jocData = joc;
            
            // Mostrar quin jugador ets amb emojis i millor estil
            const rolJugador = document.getElementById('rolJugador');
            if (joc.player1 === idJugador) {
                rolJugador.innerHTML = '🔴 <strong>Jugador 1</strong> (Quadrat VERMELL) - Usa <kbd>WASD</kbd> per moure\'t';
                rolJugador.style.color = '#ff4757';
                rolJugador.style.borderColor = 'rgba(255, 71, 87, 0.3)';
            } else if (joc.player2 === idJugador) {
                rolJugador.innerHTML = '🔵 <strong>Jugador 2</strong> (Quadrat BLAU) - Usa <kbd>WASD</kbd> per moure\'t';
                rolJugador.style.color = '#3742fa';
                rolJugador.style.borderColor = 'rgba(55, 66, 250, 0.3)';
            }

            if (joc.player1 === idJugador) {
                if (joc.player2) {
                    textEstat.innerHTML = '🎮 Joc en curs... Mou-te amb WASD!';
                    divJoc.style.display = 'block';
                } else {
                    textEstat.innerHTML = '⏳ Ets el Jugador 1. Esperant el Jugador 2...';
                    textEstat.classList.add('loading');
                }
            } else if (joc.player2 === idJugador) {
                textEstat.innerHTML = '🎮 Joc en curs... Mou-te amb WASD!';
                textEstat.classList.remove('loading');
                divJoc.style.display = 'block';
            } else {
                textEstat.innerHTML = '👀 Espectant...';
                divJoc.style.display = 'block';
            }

            // Mostrar posicions dels jugadors amb transicions suaus
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

// Afegir estils CSS per les tecles
const style = document.createElement('style');
style.textContent = `
    kbd {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: 'Orbitron', monospace;
        font-size: 0.9em;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
`;
document.head.appendChild(style);