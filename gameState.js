class GameState {
    constructor() {
        this.resetGameState();
    }
    //constructor and Initial State
    resetGameState() {
        this.gameBoard = Array(10).fill(null).map(() => Array(10).fill({ player: 0, monster: 'None' }));
        this.playerEliminationCount = { 1: 0, 2: 0 };
        this.playerMonsterCount = { 1: 0, 2: 0 };
        this.isGameOver = false;
        this.players = [1, 2];
        this.turnIndex = 0;
        this.currentPlayer = this.players[this.turnIndex];
        this.initialPlacement = true; // Flag to indicate initial placement phase
        this.initialMonstersPlaced = { 1: 0, 2: 0 }; // Track number of monsters placed by each player
        this.randomPlaceRemainingMonsters(); // Randomly place the 7 monsters before players add their own
        this.winner = null; // Track the winner of the game
        this.round = 0; // Initialize the round counter
    }
    //Game State Management
    reset() {
        this.resetGameState();
    }
    //Game Board
    getGameBoard() {
        return {
            board: this.gameBoard,
            currentPlayer: this.currentPlayer,
            initialPlacement: this.initialPlacement,
            winner: this.winner,
            round: this.round
        };
    }
    //Player Actions
    addMonster(playerId, row, column, monsterType) {
        if (playerId !== this.currentPlayer) {
            throw new Error('Not your turn!');
        }

        if (!this.isValidPlacement(playerId, row, column)) {
            throw new Error('Invalid placement for the player.');
        }

        if (this.initialPlacement && this.initialMonstersPlaced[playerId] >= 3) {
            throw new Error('You can only place 3 monsters during the initial placement phase.');
        }

        this.gameBoard[row][column] = { player: playerId, monster: monsterType };
        this.playerMonsterCount[playerId]++;
        this.initialMonstersPlaced[playerId]++;
        
        if (this.initialPlacement && this.initialMonstersPlaced[playerId] >= 3) {
            this.endTurn();
        }
    }
    //Random Generates 7 monsters each side
    randomPlaceRemainingMonsters() {
        for (let playerId of this.players) {
            for (let i = 0; i < 7; i++) {
                let placed = false;
                while (!placed) {
                    const [row, column] = this.getRandomBorderPosition(playerId);
                    if (this.gameBoard[row][column].player === 0) {
                        this.gameBoard[row][column] = {
                            player: playerId,
                            monster: this.getRandomMonsterType()
                        };
                        placed = true;
                        this.playerMonsterCount[playerId]++;
                    }
                }
            }
        }
    }
    // Place the random monster on the borders of the grid
    getRandomBorderPosition(playerId) {
        const borderRows = playerId === 1 ? [0] : [9];
        const row = borderRows[Math.floor(Math.random() * borderRows.length)];
        const column = Math.floor(Math.random() * 10);
        return [row, column];
    }
    // Get random monster type
    getRandomMonsterType() {
        const monsters = ['Vampire', 'Werewolf', 'Ghost'];
        return monsters[Math.floor(Math.random() * monsters.length)];
    }
    //Player Actions
    moveMonster(playerId, startRow, startColumn, endRow, endColumn) {
        if (this.initialPlacement) {
            throw new Error('Cannot move monsters during the initial placement phase.');
        }

        if (playerId !== this.currentPlayer) {
            throw new Error('Not your turn!');
        }

        if (!this.isValidMove(playerId, startRow, startColumn, endRow, endColumn)) {
            throw new Error('Invalid move.');
        }

        const path = this.getPath(startRow, startColumn, endRow, endColumn);
        for (let { row, column } of path) {
            if (this.gameBoard[row][column].player !== 0 && this.gameBoard[row][column].player !== playerId) {
                throw new Error('Cannot move over other player\'s monsters.');
            }
        }

        const startCell = this.gameBoard[startRow][startColumn];
        const endCell = this.gameBoard[endRow][endColumn];

        if (endCell.player !== 0 && endCell.player !== playerId) {
            this.resolveConflict(startRow, startColumn, endRow, endColumn);
        } else {
            this.gameBoard[endRow][endColumn] = startCell;
            this.gameBoard[startRow][startColumn] = { player: 0, monster: 'None' };
        }

        this.checkForNoMovesLeft();
    }
    //Game Logic and Validation
    isValidPlacement(playerId, row, column) {
        if (this.gameBoard[row][column].player !== 0) {
            return false;
        }

        if (playerId === 1 && row >= 0 && row <= 4) {
            return true;
        }

        if (playerId === 2 && row >= 5 && row <= 9) {
            return true;
        }

        return false;
    }
    //Game Logic and Validation
    isValidMove(playerId, startRow, startColumn, endRow, endColumn) {
        if (startRow < 0 || startRow >= 10 || startColumn < 0 || startColumn >= 10 ||
            endRow < 0 || endRow >= 10 || endColumn < 0 || endColumn >= 10) {
            return false;
        }

        if (this.gameBoard[startRow][startColumn].player !== playerId) {
            return false;
        }

        const rowDiff = Math.abs(endRow - startRow);
        const colDiff = Math.abs(endColumn - startColumn);

        // Allow movement up to 10 squares horizontally or vertically, or up to 2 squares diagonally
        return (rowDiff === 0 && colDiff <= 10) || (colDiff === 0 && rowDiff <= 10) || (rowDiff === colDiff && rowDiff <= 2);
    }
    //Game Logic and Validation
    getPath(startRow, startColumn, endRow, endColumn) {
        const path = [];
        const rowStep = startRow < endRow ? 1 : -1;
        const colStep = startColumn < endColumn ? 1 : -1;

        if (startRow === endRow) {
            for (let col = startColumn + colStep; col !== endColumn; col += colStep) {
                path.push({ row: startRow, column: col });
            }
        } else if (startColumn === endColumn) {
            for (let row = startRow + rowStep; row !== endRow; row += rowStep) {
                path.push({ row, column: startColumn });
            }
        } else if (Math.abs(endRow - startRow) === Math.abs(endColumn - startColumn)) {
            for (let row = startRow + rowStep, col = startColumn + colStep; row !== endRow && col !== endColumn; row += rowStep, col += colStep) {
                path.push({ row, column: col });
            }
        }

        return path;
    }
    //Game Logic and Validation
    resolveConflict(startRow, startColumn, endRow, endColumn) {
        const startCell = this.gameBoard[startRow][startColumn];
        const endCell = this.gameBoard[endRow][endColumn];

        if ((startCell.monster === 'Vampire' && endCell.monster === 'Werewolf') ||
            (startCell.monster === 'Werewolf' && endCell.monster === 'Ghost') ||
            (startCell.monster === 'Ghost' && endCell.monster === 'Vampire')) {
            // Start cell monster wins
            this.gameBoard[endRow][endColumn] = startCell;
            this.playerMonsterCount[endCell.player]--;
        } else if ((endCell.monster === 'Vampire' && startCell.monster === 'Werewolf') ||
                   (endCell.monster === 'Werewolf' && startCell.monster === 'Ghost') ||
                   (endCell.monster === 'Ghost' && startCell.monster === 'Vampire')) {
            // End cell monster wins
            this.gameBoard[startRow][startColumn] = { player: 0, monster: 'None' };
            this.playerMonsterCount[startCell.player]--;
        } else if (startCell.monster === endCell.monster) {
            // Both monsters are of the same type and are removed
            this.gameBoard[startRow][startColumn] = { player: 0, monster: 'None' };
            this.gameBoard[endRow][endColumn] = { player: 0, monster: 'None' };
            this.playerMonsterCount[startCell.player]--;
            this.playerMonsterCount[endCell.player]--;
        }

        this.gameBoard[startRow][startColumn] = { player: 0, monster: 'None' };
    }
    //Game Logic and Validation
    checkForNoMovesLeft() {
        const currentPlayerMonsters = this.gameBoard.flat().filter(cell => cell.player === this.currentPlayer);
        if (currentPlayerMonsters.length === 0 || !currentPlayerMonsters.some(monster => this.canMonsterMove(monster))) {
            this.endTurn();
        }
    }
    //Game Logic and Validation
    canMonsterMove(monster) {
        // Define logic to check if a monster can move
        return true; // Replace this with actual logic
    }
    //Player Actions 
    endTurn() {
        if (this.isGameOver) {
            return;
        }
        if (this.initialPlacement && this.initialMonstersPlaced[1] >= 3 && this.initialMonstersPlaced[2] >= 3) {
            this.initialPlacement = false;
            this.turnIndex = this.players.indexOf(this.determineFirstPlayer());
        } else {
            this.turnIndex = (this.turnIndex + 1) % this.players.length;
            if (this.turnIndex === 0) {
                this.round++; // Increment the round counter after both players have taken their turns
            }
            this.currentPlayer = this.players[this.turnIndex];
        }
        this.checkForWin();
    }
    //Game Logic
    determineFirstPlayer() {
        const playerCounts = Object.entries(this.playerMonsterCount);
        playerCounts.sort((a, b) => a[1] - b[1]);
        const minCount = playerCounts[0][1];
        const tiedPlayers = playerCounts.filter(([player, count]) => count === minCount).map(([player]) => parseInt(player));
        return tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)];
    }
    //Game Logic
    determineNextPlayer() {
        const playerCounts = Object.entries(this.playerMonsterCount);
        playerCounts.sort((a, b) => a[1] - b[1]);
        const minCount = playerCounts[0][1];
        const tiedPlayers = playerCounts.filter(([player, count]) => count === minCount).map(([player]) => parseInt(player));
        return tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)];
    }
    //Validation
    checkForWin() {
        if (this.playerMonsterCount[1] <= 0 && this.playerMonsterCount[2] <= 0) {
            this.winner = 'draw';
            this.isGameOver = true;
        } else if (this.playerMonsterCount[1] <= 0) {
            this.winner = 2;
            this.isGameOver = true;
        } else if (this.playerMonsterCount[2] <= 0) {
            this.winner = 1;
            this.isGameOver = true;
        }
    }
}

module.exports = GameState;
