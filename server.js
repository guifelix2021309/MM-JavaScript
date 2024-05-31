const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const GameState = require('./gameState');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

let games = [];
let playerStats = { 1: { wins: 0, losses: 0 }, 2: { wins: 0, losses: 0 } };

app.post('/api/game', (req, res) => {
    const newGame = new GameState();
    games.push(newGame);
    res.json({ gameId: games.length - 1 });
});

app.get('/api/game/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    if (games[gameId]) {
        res.json(games[gameId].getGameBoard());
    } else {
        res.status(404).send('Game not found');
    }
});

app.post('/api/game/:gameId/addMonster', (req, res) => {
    const gameId = req.params.gameId;
    const { playerId, row, column, monsterType } = req.body;
    try {
        if (games[gameId]) {
            games[gameId].addMonster(playerId, row, column, monsterType);
            res.json(games[gameId].getGameBoard());
        } else {
            res.status(404).send('Game not found');
        }
    } catch (error) {
        res.status(400).send(error.message);
    }
});

app.post('/api/game/:gameId/moveMonster', (req, res) => {
    const gameId = req.params.gameId;
    const { playerId, startRow, startColumn, endRow, endColumn } = req.body;
    try {
        if (games[gameId]) {
            games[gameId].moveMonster(playerId, startRow, startColumn, endRow, endColumn);
            res.json(games[gameId].getGameBoard());
        } else {
            res.status(404).send('Game not found');
        }
    } catch (error) {
        res.status(400).send(error.message);
    }
});

app.post('/api/game/:gameId/endTurn', (req, res) => {
    const gameId = req.params.gameId;
    try {
        if (games[gameId]) {
            games[gameId].endTurn();
            const gameState = games[gameId];
            if (gameState.winner) {
                playerStats[gameState.winner].wins++;
                const loser = gameState.winner === 1 ? 2 : 1;
                playerStats[loser].losses++;
            }
            res.json(gameState.getGameBoard());
        } else {
            res.status(404).send('Game not found');
        }
    } catch (error) {
        res.status(400).send(error.message);
    }
});

app.get('/api/stats', (req, res) => {
    res.json(playerStats);
});

app.get('/api/gamesPlayed', (req, res) => {
    res.json({ gamesPlayed: games.length });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
