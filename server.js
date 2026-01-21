const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let roomsData = {};
for (let i = 1; i <= 10; i++) {
    roomsData[`Stanza ${i}`] = { players: [], spectators: [] };
}

io.on('connection', (socket) => {
    socket.on('join-lobby', (username) => {
        socket.username = username;
        socket.join('lobby');
        io.to('lobby').emit('nuovo-messaggio-lobby', { user: 'SISTEMA', text: `${username} è entrato nella lobby.` });
        io.emit('update-room-list', roomsData);
    });

    socket.on('join-room', ({ roomName, asSpectator }) => {
        const room = roomsData[roomName];
        if (!asSpectator && room.players.length >= 2) {
            return socket.emit('errore', 'Stanza piena! Entra come spettatore.');
        }

        socket.leave('lobby');
        socket.join(roomName);
        socket.currentRoom = roomName;

        if (asSpectator) {
            room.spectators.push(socket.username);
            socket.emit('assegna-ruolo', { symbol: '👀', roomName, isSpectator: true });
        } else {
            const symbol = room.players.length === 0 ? "X" : "O";
            room.players.push({ id: socket.id, name: socket.username, symbol });
            socket.emit('assegna-ruolo', { symbol, roomName, isSpectator: false });
        }

        io.emit('update-room-list', roomsData);
        io.to(roomName).emit('nuovo-messaggio-stanza', { user: 'SISTEMA', text: `${socket.username} è entrato.` });
    });

    socket.on('mossa-fatta', (data) => {
        socket.to(data.roomName).emit('ricevi-mossa', data);
    });

    socket.on('invio-messaggio-lobby', (msg) => {
        io.to('lobby').emit('nuovo-messaggio-lobby', { user: socket.username, text: msg });
    });

    socket.on('invio-messaggio-stanza', (data) => {
        io.to(data.roomName).emit('nuovo-messaggio-stanza', { user: socket.username, text: data.text });
    });

    socket.on('disconnect', () => {
        for (let r in roomsData) {
            roomsData[r].players = roomsData[r].players.filter(p => p.id !== socket.id);
            roomsData[r].spectators = roomsData[r].spectators.filter(s => s !== socket.username);
        }
        io.emit('update-room-list', roomsData);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server attivo`));