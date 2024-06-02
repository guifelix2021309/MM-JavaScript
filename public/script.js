const socket = io();

document.getElementById('joinGameButton').addEventListener('click', joinGame);
document.getElementById('endTurnButton').addEventListener('click', endTurn);

let selectedMonster = null; // To store the position of the selected monster
let currentGameId = null; // To store the current game ID
let currentPlayer = null; // To store the current player
let playerNicknames = {}; // To store player nicknames
let initialPlacement = false; // To track if the initial placement phase is ongoing

socket.on('waitingForOpponent', () => {
    document.getElementById('nicknameForm').style.display = 'none';
    document.getElementById('waitingMessage').style.display = 'block';
});

socket.on('startGame', ({ gameId, players }) => {
    document.getElementById('nicknameForm').style.display = 'none';
    document.getElementById('waitingMessage').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    currentGameId = gameId;
    players.forEach(player => {
        playerNicknames[player.id] = player.nickname;
    });

    const player = players.find(p => p.socketId === socket.id);
    currentPlayer = player.id;
    document.getElementById('currentPlayer').textContent = `Current Player: ${player.nickname}`;
    document.getElementById('player1Name').textContent = playerNicknames[1];
    document.getElementById('player2Name').textContent = playerNicknames[2];
    document.getElementById('player1Stats').innerHTML = `<span id="player1Name" class="player1-name">${playerNicknames[1]}</span> - Wins: <span id="player1Wins">0</span>, Losses: <span id="player1Losses">0</span>`;
    document.getElementById('player2Stats').innerHTML = `<span id="player2Name" class="player2-name">${playerNicknames[2]}</span> - Wins: <span id="player2Wins">0</span>, Losses: <span id="player2Losses">0</span>`;
    fetchGameState(gameId); // Fetch the initial game state
});

socket.on('gameState', (gameState) => {
    displayGameBoard(gameState.board);
    displayCurrentPlayer(gameState.currentPlayer);
    updateRoundCounter(gameState.round);
    initialPlacement = gameState.initialPlacement;
    document.getElementById('endTurnButton').style.display = initialPlacement ? 'none' : 'block';
    if (initialPlacement) {
        displayMonsterOptions();
    } else {
        document.getElementById('monsterOptions').innerHTML = ''; // Clear options after initial placement
    }

    if (gameState.gameOver) {
        handleGameEnd(gameState.winner);
    }

    checkForNoMovesLeft();
});

socket.on('error', (message) => {
    alert(message);
});

function joinGame() {
    const nickname = document.getElementById('nickname').value;
    if (nickname) {
        socket.emit('joinGame', nickname);
    } else {
        alert('Please enter a nickname.');
    }
}

async function fetchGameState(gameId) {
    try {
        console.log(`Fetching game state for game ID: ${gameId}`);
        const response = await fetch(`/api/game/${gameId}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        
        const gameState = await response.json();
        
        if (!gameState || !gameState.board) {
            throw new Error('Invalid game state received: ' + JSON.stringify(gameState));
        }
        
        console.log('Game state fetched successfully:', gameState);
        displayGameBoard(gameState.board);
        displayCurrentPlayer(gameState.currentPlayer);
        updateRoundCounter(gameState.round);
        initialPlacement = gameState.initialPlacement;
        document.getElementById('endTurnButton').style.display = initialPlacement ? 'none' : 'block';
        
        if (initialPlacement) {
            displayMonsterOptions();
        } else {
            document.getElementById('monsterOptions').innerHTML = ''; // Clear options after initial placement
        }
        
        checkForNoMovesLeft();
    } catch (error) {
        console.error('Error fetching game state:', error);
    }
}

function displayGameBoard(gameBoard) {
    const tbody = document.querySelector('#gameBoard tbody');
    tbody.innerHTML = '';
    for (let i = 0; i < gameBoard.length; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < gameBoard[i].length; j++) {
            const cell = document.createElement('td');
            const { player, monster } = gameBoard[i][j];
            cell.textContent = player === 0 ? '' : `P${player} - ${monster}`;
            cell.dataset.row = i;
            cell.dataset.column = j;
            cell.dataset.player = player;
            cell.dataset.monster = monster;

            // Apply class based on player
            if (player === 1) {
                cell.classList.add('player1');
            } else if (player === 2) {
                cell.classList.add('player2');
            }

            cell.addEventListener('click', handleCellClick);
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
}

function displayCurrentPlayer(playerId) {
    const playerName = playerNicknames[playerId] || `Player ${playerId}`;
    document.getElementById('currentPlayer').textContent = `Current Player: ${playerName}`;
}

function displayMonsterOptions() {
    const monsterOptions = document.getElementById('monsterOptions');
    monsterOptions.innerHTML = `
        <button onclick="selectMonster('Vampire')">Vampire</button>
        <button onclick="selectMonster('Werewolf')">Werewolf</button>
        <button onclick="selectMonster('Ghost')">Ghost</button>
    `;
}

function selectMonster(monsterType) {
    selectedMonster = { monster: monsterType };
}

function handleCellClick(event) {
    const cell = event.target;
    const row = parseInt(cell.dataset.row);
    const column = parseInt(cell.dataset.column);
    const player = parseInt(cell.dataset.player);
    const monster = cell.dataset.monster;

    if (initialPlacement) {
        if (selectedMonster) {
            if (player === 0) {
                placeMonster(row, column, selectedMonster.monster);
                selectedMonster = null; // Reset the selected monster
            } else {
                alert('Invalid placement. Target cell is not empty.');
            }
        } else {
            alert('Select a monster to place from the options below.');
        }
    } else {
        if (selectedMonster) {
            if (player === 0 || player !== currentPlayer) { // Allow moving to an empty cell or into a cell occupied by an enemy
                moveMonster(selectedMonster.row, selectedMonster.column, row, column);
                selectedMonster = null; // Reset the selected monster
            } else {
                alert('Invalid move. Target cell is occupied by your own monster.');
            }
        } else if (player === currentPlayer) {
            // Select the monster if it belongs to the current player
            selectedMonster = { row, column, player, monster };
            cell.style.backgroundColor = 'yellow'; // Highlight selected cell
        } else {
            alert('Invalid selection. You can only select your own monsters.');
        }
    }
}

function placeMonster(row, column, monsterType) {
    socket.emit('addMonster', { gameId: currentGameId, playerId: currentPlayer, row, column, monsterType });
}

function moveMonster(startRow, startColumn, endRow, endColumn) {
    socket.emit('moveMonster', { gameId: currentGameId, playerId: currentPlayer, startRow, startColumn, endRow, endColumn });
}

function endTurn() {
    socket.emit('endTurn', { gameId: currentGameId, playerId: currentPlayer });
}

function checkForNoMovesLeft() {
    const currentPlayerMonsters = Array.from(document.querySelectorAll('td')).filter(cell => parseInt(cell.dataset.player) === currentPlayer);
    let hasMovesLeft = false;
    for (const cell of currentPlayerMonsters) {
        const row = parseInt(cell.dataset.row);
        const column = parseInt(cell.dataset.column);
        if (canMove(row, column)) {
            hasMovesLeft = true;
            break;
        }
    }
    if (!hasMovesLeft) {
        endTurn();
    }
}

function canMove(row, column) {
    // Define the logic to check if a monster at (row, column) can move
    return true; // Replace this with actual logic
}

async function updateStats() {
    try {
        const gamesPlayedResponse = await fetch('/api/gamesPlayed');
        const gamesPlayedData = await gamesPlayedResponse.json();
        document.getElementById('gamesPlayed').textContent = `Games Played: ${gamesPlayedData.gamesPlayed}`;

        const statsResponse = await fetch('/api/stats');
        const statsData = await statsResponse.json();
        document.getElementById('player1Wins').textContent = statsData[1].wins;
        document.getElementById('player1Losses').textContent = statsData[1].losses;
        document.getElementById('player2Wins').textContent = statsData[2].wins;
        document.getElementById('player2Losses').textContent = statsData[2].losses;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function updateRoundCounter(round) {
    document.getElementById('roundCounter').textContent = `Round: ${round}`;
}

function handleGameEnd(winner) {
    if (winner === 'draw') {
        alert('The game is a draw!');
        updatePlayerStats(1, 'win');
        updatePlayerStats(2, 'win');
    } else {
        alert(`Player ${playerNicknames[winner]} wins!`);
        updatePlayerStats(winner, 'win');
        const loser = winner === 1 ? 2 : 1;
        updatePlayerStats(loser, 'loss');
    }
    updateStats();
    showPlayAgainOption();
}

function updatePlayerStats(playerId, result) {
    const winElement = document.getElementById(`player${playerId}Wins`);
    const lossElement = document.getElementById(`player${playerId}Losses`);
    if (result === 'win') {
        winElement.textContent = parseInt(winElement.textContent) + 1;
    } else if (result === 'loss') {
        lossElement.textContent = parseInt(lossElement.textContent) + 1;
    }
}

function showPlayAgainOption() {
    const playAgainMessage = document.createElement('div');
    playAgainMessage.innerHTML = `
        <p>Would you like to play again?</p>
        <button id="playAgainYes">Yes</button>
        <button id="playAgainNo">No</button>
    `;
    document.body.appendChild(playAgainMessage);

    document.getElementById('playAgainYes').addEventListener('click', () => {
        playAgainMessage.remove();
        socket.emit('playAgain', { gameId: currentGameId });
    });

    document.getElementById('playAgainNo').addEventListener('click', () => {
        playAgainMessage.remove();
        window.location.href = '/';
    });
}

function resetClientState() {
    // Reset the client state to initial conditions for a new game
    initialPlacement = true;
    selectedMonster = null;
    document.getElementById('endTurnButton').style.display = 'none';
    document.getElementById('monsterOptions').innerHTML = ''; // Clear options to ensure fresh start
    displayMonsterOptions(); // Display monster options for the new game
    fetchGameState(currentGameId); // Fetch the new game state
}
