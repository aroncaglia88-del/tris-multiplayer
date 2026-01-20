
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let players = {}; 

io.on('connection', (socket) => {
    // Assegnazione simbolo X o O
    if (Object.keys(players).length === 0) {
        players[socket.id] = "X";
    } else if (Object.keys(players).length === 1) {
        players[socket.id] = "O";
    }

    socket.emit('assegna-simbolo', players[socket.id]);

    socket.on('mossa-fatta', (data) => {
        socket.broadcast.emit('ricevi-mossa', data);
    });

    socket.on('invio-messaggio', (msg) => {
        io.emit('nuovo-messaggio', msg);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server attivo sulla porta ${PORT}`);
});