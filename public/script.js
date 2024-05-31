document.getElementById('startGameButton').addEventListener('click', startGame);
document.getElementById('endTurnButton').addEventListener('click', endTurn);

let selectedMonster = null; // To store the position of the selected monster
let currentGameId = null; // To store the current game ID
let currentPlayer = null; // To store the current player
let initialPlacement = false; // To track if the initial placement phase is ongoing
let roundCounter = 0; // Initialize the round counter

async function startGame() {
    try {
        const response = await fetch('http://localhost:3000/api/game', { method: 'POST' });
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const data = await response.json();
        currentGameId = data.gameId;
        fetchGameState(currentGameId);
        updateStats();
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

async function fetchGameState(gameId) {
    try {
        const response = await fetch(`http://localhost:3000/api/game/${gameId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const gameState = await response.json();
        displayGameBoard(gameState.board);
        displayCurrentPlayer(gameState.currentPlayer);
        updateRoundCounter(gameState.round);
        currentPlayer = gameState.currentPlayer;
        initialPlacement = gameState.initialPlacement;
        document.getElementById('gameBoard').style.display = 'table';
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
            cell.addEventListener('click', handleCellClick);
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
}

function displayCurrentPlayer(player) {
    document.getElementById('currentPlayer').textContent = `Current Player: Player ${player}`;
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

async function placeMonster(row, column, monsterType) {
    try {
        const response = await fetch(`http://localhost:3000/api/game/${currentGameId}/addMonster`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: currentPlayer,
                row,
                column,
                monsterType,
            }),
        });
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const gameState = await response.json();
        displayGameBoard(gameState.board);
        displayCurrentPlayer(gameState.currentPlayer);
        updateRoundCounter(gameState.round);
        currentPlayer = gameState.currentPlayer;
        initialPlacement = gameState.initialPlacement;
        if (initialPlacement) {
            displayMonsterOptions();
        } else {
            document.getElementById('monsterOptions').innerHTML = ''; // Clear options after initial placement
        }
        document.getElementById('endTurnButton').style.display = initialPlacement ? 'none' : 'block';
        checkForNoMovesLeft();
    } catch (error) {
        console.error('Error placing monster:', error);
    }
}

async function moveMonster(startRow, startColumn, endRow, endColumn) {
    try {
        const response = await fetch(`http://localhost:3000/api/game/${currentGameId}/moveMonster`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: currentPlayer,
                startRow,
                startColumn,
                endRow,
                endColumn,
            }),
        });
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const gameState = await response.json();
        displayGameBoard(gameState.board);
        displayCurrentPlayer(gameState.currentPlayer);
        updateRoundCounter(gameState.round);
        currentPlayer = gameState.currentPlayer;
        checkForNoMovesLeft();
    } catch (error) {
        console.error('Error moving monster:', error);
    }
}

async function endTurn() {
    try {
        const response = await fetch(`http://localhost:3000/api/game/${currentGameId}/endTurn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const gameState = await response.json();
        displayGameBoard(gameState.board);
        displayCurrentPlayer(gameState.currentPlayer);
        updateRoundCounter(gameState.round);
        currentPlayer = gameState.currentPlayer;
        initialPlacement = gameState.initialPlacement;
        document.getElementById('endTurnButton').style.display = initialPlacement ? 'none' : 'block';
        checkForWin(gameState);
    } catch (error) {
        console.error('Error ending turn:', error);
    }
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

function checkForWin(gameState) {
    if (gameState.winner) {
        alert(`Player ${gameState.winner} wins!`);
        updateStats();
    }
}

async function updateStats() {
    try {
        const gamesPlayedResponse = await fetch('http://localhost:3000/api/gamesPlayed');
        const gamesPlayedData = await gamesPlayedResponse.json();
        document.getElementById('gamesPlayed').textContent = `Games Played: ${gamesPlayedData.gamesPlayed}`;

        const statsResponse = await fetch('http://localhost:3000/api/stats');
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
