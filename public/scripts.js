let idJoc, idJugador;
let jocData = {};
let gridCells = {};
let scoreRed = 0;
let scoreBlue = 0;
let gameTimer = 30;
let timerInterval = null;
let gameEnded = false;

const jugador1 = document.getElementById('jugador1');
const jugador2 = document.getElementById('jugador2');
const textEstat = document.getElementById('estat');
const divJoc = document.getElementById('joc');
const areaDeJoc = document.getElementById('areaDeJoc');
const gameTimerElement = document.getElementById('gameTimer');

// Mida del grid: 10x10 caselles de 40px
const GRID_SIZE = 10;
const CELL_SIZE = 40;

// Crear el grid de caselles
function crearGrid() {
    areaDeJoc.innerHTML = '';
    gridCells = {};
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            areaDeJoc.appendChild(cell);
            
            const cellKey = `${row}-${col}`;
            gridCells[cellKey] = {
                element: cell,
                painted: false,
                color: null
            };
        }
    }
    
    // Afegir els jugadors després del grid
    areaDeJoc.appendChild(jugador1);
    areaDeJoc.appendChild(jugador2);
}

// Convertir posició de píxels a coordenades de grid
function pixelsToGrid(x, y) {
    return {
        col: Math.floor(x / CELL_SIZE),
        row: Math.floor(y / CELL_SIZE)
    };
}

// Convertir coordenades de grid a píxels
function gridToPixels(row, col) {
    return {
        x: col * CELL_SIZE,
        y: row * CELL_SIZE
    };
}

// Pintar una casella
function pintarCasella(row, col, color) {
    const cellKey = `${row}-${col}`;
    if (gridCells[cellKey] && (!gridCells[cellKey].painted || gridCells[cellKey].color !== color)) {
        const cell = gridCells[cellKey].element;
        
        // Eliminar classe anterior si existeix
        cell.classList.remove('painted-red', 'painted-blue');
        
        // Afegir nova classe
        const className = color === 'red' ? 'painted-red' : 'painted-blue';
        cell.classList.add(className);
        
        // Actualitzar puntuació només si la casella no estava pintada del mateix color
        if (gridCells[cellKey].color !== color) {
            if (gridCells[cellKey].painted && gridCells[cellKey].color) {
                // Treure punt del color anterior
                if (gridCells[cellKey].color === 'red') scoreRed--;
                else scoreBlue--;
            }
            
            // Afegir punt al nou color
            if (color === 'red') scoreRed++;
            else scoreBlue++;
            
            // Actualitzar puntuació a la pantalla
            document.getElementById('scoreRed').textContent = scoreRed;
            document.getElementById('scoreBlue').textContent = scoreBlue;
        }
        
        gridCells[cellKey].painted = true;
        gridCells[cellKey].color = color;
    }
}

// Recalcular puntuació total basada en les caselles actuals
function recalcularPuntuacio() {
    scoreRed = 0;
    scoreBlue = 0;
    
    // Comptar totes les caselles pintades
    for (let cellKey in gridCells) {
        if (gridCells[cellKey].painted) {
            if (gridCells[cellKey].color === 'red') {
                scoreRed++;
            } else if (gridCells[cellKey].color === 'blue') {
                scoreBlue++;
            }
        }
    }
    
    // Actualitzar display
    document.getElementById('scoreRed').textContent = scoreRed;
    document.getElementById('scoreBlue').textContent = scoreBlue;
}

// Funcions del cronòmetre
function iniciarCronòmetre() {
    gameTimer = 30;
    gameEnded = false;
    actualitzarCronòmetre();
    
    timerInterval = setInterval(() => {
        gameTimer--;
        actualitzarCronòmetre();
        
        if (gameTimer <= 0) {
            finalitzarJoc();
        }
    }, 1000);
}

function actualitzarCronòmetre() {
    gameTimerElement.textContent = `⏱️ ${gameTimer}`;
    
    // Efecte visual quan queden menys de 10 segons
    if (gameTimer <= 10) {
        gameTimerElement.classList.add('warning');
    } else {
        gameTimerElement.classList.remove('warning');
    }
}

function aturarCronòmetre() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function finalitzarJoc() {
    gameEnded = true;
    aturarCronòmetre();
    
    // Determinar guanyador
    let resultat = '';
    let titol = '';
    
    if (scoreRed > scoreBlue) {
        titol = '🎉 Jugador 1 Guanya!';
        resultat = `El <strong style="color: #ff4757;">Jugador 1 (Vermell)</strong> ha guanyat amb <strong>${scoreRed}</strong> caselles!<br>
                   Jugador 2 (Blau): ${scoreBlue} caselles`;
    } else if (scoreBlue > scoreRed) {
        titol = '🎉 Jugador 2 Guanya!';
        resultat = `El <strong style="color: #3742fa;">Jugador 2 (Blau)</strong> ha guanyat amb <strong>${scoreBlue}</strong> caselles!<br>
                   Jugador 1 (Vermell): ${scoreRed} caselles`;
    } else {
        titol = '🤝 Empat!';
        resultat = `Empat perfecte! Tots dos jugadors tenen <strong>${scoreRed}</strong> caselles pintades.`;
    }
    
    // Mostrar modal de final de joc
    document.getElementById('gameEndTitle').innerHTML = titol;
    document.getElementById('gameEndMessage').innerHTML = resultat;
    document.getElementById('gameEndModal').style.display = 'flex';
    
    // Marcar joc com acabat al servidor
    fetch(`game.php?action=endgame&game_id=${idJoc}&winner=${scoreRed > scoreBlue ? 'red' : scoreBlue > scoreRed ? 'blue' : 'draw'}`);
}

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
let ultimMoviment = 0;
const COOLDOWN_MOVIMENT = 150; // Reduït per moviment més ràpid

// Gestionar les tecles per moure els jugadors
function gestionarTecles(event) {
    if (!idJugador || teclesPremudes.has(event.key) || gameEnded) return;

    // Evitar moviments massa ràpids
    const ara = Date.now();
    if (ara - ultimMoviment < COOLDOWN_MOVIMENT) return;

    let esJugador1 = false;
    let esJugador2 = false;
    let jugadorElement;
    let currentPos;

    // Determinar quin jugador ets
    if (jocData.player1 === idJugador) {
        esJugador1 = true;
        jugadorElement = jugador1;
        currentPos = pixelsToGrid(
            parseInt(jugador1.style.left) || 0,
            parseInt(jugador1.style.top) || 0
        );
    } else if (jocData.player2 === idJugador) {
        esJugador2 = true;
        jugadorElement = jugador2;
        currentPos = pixelsToGrid(
            parseInt(jugador2.style.left) || 0,
            parseInt(jugador2.style.top) || 0
        );
    } else {
        return; // No ets cap dels jugadors
    }

    let newRow = currentPos.row;
    let newCol = currentPos.col;
    let moved = false;

    // Controls WASD per moure's per caselles
    switch(event.key.toLowerCase()) {
        case 'w':
            if (newRow > 0) {
                newRow--;
                moved = true;
            }
            break;
        case 's':
            if (newRow < GRID_SIZE - 1) {
                newRow++;
                moved = true;
            }
            break;
        case 'a':
            if (newCol > 0) {
                newCol--;
                moved = true;
            }
            break;
        case 'd':
            if (newCol < GRID_SIZE - 1) {
                newCol++;
                moved = true;
            }
            break;
        default:
            return;
    }

    if (moved) {
        // Actualitzar temps de l'últim moviment
        ultimMoviment = Date.now();
        teclesPremudes.add(event.key);

        // Convertir a píxels
        const newPixelPos = gridToPixels(newRow, newCol);

        // Moviment instantani - actualitzar posició
        jugadorElement.style.left = newPixelPos.x + 'px';
        jugadorElement.style.top = newPixelPos.y + 'px';

        // Pintar la casella IMMEDIATAMENT quan arribem
        const color = esJugador1 ? 'red' : 'blue';
        pintarCasella(newRow, newCol, color);

        // Enviar nova posició al servidor
        const playerNum = esJugador1 ? 1 : 2;
        fetch(`game.php?action=move&game_id=${idJoc}&player=${playerNum}&x=${newPixelPos.x}&y=${newPixelPos.y}&row=${newRow}&col=${newCol}&color=${color}`)
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
                    
                    // Iniciar cronòmetre si tots dos jugadors estan connectats i no ha començat
                    if (!timerInterval && !gameEnded && joc.game_started) {
                        iniciarCronòmetre();
                    }
                } else {
                    textEstat.innerHTML = '⏳ Ets el Jugador 1. Esperant el Jugador 2...';
                    textEstat.classList.add('loading');
                }
            } else if (joc.player2 === idJugador) {
                textEstat.innerHTML = '🎮 Joc en curs... Mou-te amb WASD!';
                textEstat.classList.remove('loading');
                divJoc.style.display = 'block';
                
                // Iniciar cronòmetre si tots dos jugadors estan connectats i no ha començat
                if (!timerInterval && !gameEnded && joc.game_started) {
                    iniciarCronòmetre();
                }
            } else {
                textEstat.innerHTML = '👀 Espectant...';
                divJoc.style.display = 'block';
            }

            // Comprovar si el joc ha acabat
            if (joc.game_ended && !gameEnded) {
                finalitzarJoc();
                return;
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

            // Sincronitzar caselles pintades
            if (joc.painted_cells) {
                joc.painted_cells.forEach(cell => {
                    pintarCasella(cell.row, cell.col, cell.color);
                });
            }

            setTimeout(comprovarEstatDelJoc, 100);
        });
}

// Iniciar el joc quan la pàgina estigui carregada
document.addEventListener('DOMContentLoaded', function() {
    crearGrid();
    unirseAlJoc();
    
    // Event listener per al botó de nou joc
    document.getElementById('newGameBtn').addEventListener('click', function() {
        location.reload(); // Recarregar la pàgina per començar un nou joc
    });
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