const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const GameState = require('./gameState');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

let games = [];
let playerStats = { 1: { wins: 0, losses: 0 }, 2: { wins: 0, losses: 0 } };
let gamesPlayed = 0; // Add this counter

app.get('/api/stats', (req, res) => {
    res.json(playerStats);
});

app.get('/api/gamesPlayed', (req, res) => {
    res.json({ gamesPlayed });
});

app.get('/api/game/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    if (games[gameId]) {
        res.json(games[gameId].getGameBoard());
    } else {
        res.status(404).send('Game not found');
    }
});

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinGame', (nickname) => {
        if (waitingPlayer) {
            const gameId = games.length;
            const newGame = new GameState();
            games.push(newGame);
            socket.join(gameId);
            waitingPlayer.socket.join(gameId);

            const players = [
                { id: 1, socketId: waitingPlayer.socket.id, nickname: waitingPlayer.nickname },
                { id: 2, socketId: socket.id, nickname }
            ];

            io.to(gameId).emit('startGame', { gameId, players });
            waitingPlayer = null;
        } else {
            waitingPlayer = { socket, nickname };
            socket.emit('waitingForOpponent');
        }
    });

    socket.on('addMonster', ({ gameId, playerId, row, column, monsterType }) => {
        try {
            if (games[gameId]) {
                games[gameId].addMonster(playerId, row, column, monsterType);
                io.to(gameId).emit('gameState', { ...games[gameId].getGameBoard(), players: games[gameId].players });
            }
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('moveMonster', ({ gameId, playerId, startRow, startColumn, endRow, endColumn }) => {
        try {
            if (games[gameId]) {
                games[gameId].moveMonster(playerId, startRow, startColumn, endRow, endColumn);
                io.to(gameId).emit('gameState', { ...games[gameId].getGameBoard(), players: games[gameId].players });
            }
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('endTurn', ({ gameId, playerId }) => {
        try {
            const gameState = games[gameId];
            
            if (!gameState) {
                socket.emit('error', 'Game does not exist.');
                return;
            }
    
            if (gameState.isGameOver) {
                socket.emit('error', 'Game is already over.');
                return;
            }
    
            if (gameState.currentPlayer !== playerId) {
                socket.emit('error', 'It is not your turn.');
                return;
            }
    
            gameState.endTurn();
            
            if (gameState.isGameOver) {
                // Ensure stats are updated only once
                if (gameState.winner === 'draw') {
                    playerStats[1].wins += 1;
                    playerStats[2].wins += 1;
                } else {
                    playerStats[gameState.winner].wins += 1;
                    const loser = gameState.winner === 1 ? 2 : 1;
                    playerStats[loser].losses += 1;
                }
                gamesPlayed += 1;
    
                // Send the final game state to clients
                io.to(gameId).emit('gameState', { 
                    ...gameState.getGameBoard(), 
                    players: gameState.players, 
                    gameOver: true, 
                    winner: gameState.winner 
                });
            } else {
                // Send the updated game state to clients
                io.to(gameId).emit('gameState', { 
                    ...gameState.getGameBoard(), 
                    players: gameState.players 
                });
            }
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('playAgain', ({ gameId }) => {
        if (games[gameId]) {
            games[gameId].reset();
            io.to(gameId).emit('startGame', { gameId, players: games[gameId].players });
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
            waitingPlayer = null;
        }
    });
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
