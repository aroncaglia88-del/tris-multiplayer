let socket;
let myUsername = "";
let mySymbol = "";
let currentRoom = "";
let isSpectator = false;
let turn = "X";
let gameState = Array(9).fill("");
let gameActive = true;

const moveSnd = document.getElementById('snd-move');
const winSnd = document.getElementById('snd-win');
const chatSnd = document.getElementById('snd-chat');

window.onload = () => {
    const savedUser = localStorage.getItem('tris-username');
    if (savedUser) document.getElementById('user-input').value = savedUser;
};

function playSnd(a) { a.currentTime = 0; a.play().catch(()=>{}); }

function login() {
    const name = document.getElementById('user-input').value.trim();
    if (!name) return alert("Inserisci un nome!");

    const lastChange = localStorage.getItem('tris-last-change');
    const now = Date.now();
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;

    if (localStorage.getItem('tris-username') && localStorage.getItem('tris-username') !== name) {
        if (lastChange && (now - lastChange < twoWeeks)) {
            alert("Puoi cambiare nome solo ogni 2 settimane!");
            return;
        }
    }

    localStorage.setItem('tris-username', name);
    localStorage.setItem('tris-last-change', now);
    myUsername = name;
    startSocket();
}

function startSocket() {
    socket = io();
    socket.emit('join-lobby', myUsername);
    document.getElementById('screen-login').style.display = 'none';
    document.getElementById('screen-lobby').style.display = 'flex';

    socket.on('update-room-list', (rooms) => {
        const grid = document.getElementById('rooms-grid');
        grid.innerHTML = "";
        for (let r in rooms) {
            const players = rooms[r].players.map(p => p.name).join(", ") || "Nessuno";
            grid.innerHTML += `<div class="room-card"><h3>${r}</h3><p>${players}</p>
                <button onclick="joinRoom('${r}', false)">Gioca</button>
                <button onclick="joinRoom('${r}', true)">Assisti</button></div>`;
        }
    });

    socket.on('assegna-ruolo', (data) => {
        mySymbol = data.symbol;
        currentRoom = data.roomName;
        isSpectator = data.isSpectator;
        document.getElementById('screen-lobby').style.display = 'none';
        document.getElementById('screen-game').style.display = 'flex';
        if(isSpectator) document.getElementById('room-input').placeholder = "Solo lettura (Spettatore)";
    });

    socket.on('nuovo-messaggio-lobby', (data) => {
        if(data.user !== myUsername) playSnd(chatSnd);
        renderMsg('lobby-chat-box', data);
        renderMsg('lobby-chat-box-game', data);
    });

    socket.on('nuovo-messaggio-stanza', (data) => {
        if(data.user !== myUsername) playSnd(chatSnd);
        renderMsg('room-chat-box', data);
    });

    socket.on('ricevi-mossa', (data) => {
        playSnd(moveSnd);
        gameState[data.index] = data.player;
        const cell = document.querySelector(`[data-index="${data.index}"]`);
        cell.innerText = data.player;
        cell.style.color = data.player === "X" ? "#e94560" : "#4ecca3";
        checkWin();
        turn = data.player === "X" ? "O" : "X";
        updateStatus();
    });
}

function joinRoom(name, spec) { socket.emit('join-room', { roomName: name, asSpectator: spec }); }

function renderMsg(id, data) {
    const b = document.getElementById(id);
    if(!b) return;
    b.innerHTML += `<div><b>${data.user}:</b> ${data.text}</div>`;
    b.scrollTop = b.scrollHeight;
}

document.querySelectorAll('.cell').forEach(c => {
    c.onclick = () => {
        const i = c.dataset.index;
        if (gameActive && !isSpectator && turn === mySymbol && gameState[i] === "") {
            playSnd(moveSnd);
            gameState[i] = mySymbol;
            c.innerText = mySymbol;
            c.style.color = mySymbol === "X" ? "#e94560" : "#4ecca3";
            socket.emit('mossa-fatta', { index: i, player: mySymbol, roomName: currentRoom });
            checkWin();
            turn = mySymbol === "X" ? "O" : "X";
            updateStatus();
        }
    };
});

function updateStatus() {
    const s = document.getElementById('game-status');
    if(!gameActive) return;
    s.innerText = turn === mySymbol ? "Tocca a te!" : `Tocca a ${turn}`;
}

function checkWin() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let s of wins) {
        if (gameState[s[0]] && gameState[s[0]] === gameState[s[1]] && gameState[s[0]] === gameState[s[2]]) {
            playSnd(winSnd);
            return endGame(`Vince ${gameState[s[0]]}`);
        }
    }
    if (!gameState.includes("")) endGame("Pareggio!");
}

function endGame(res) {
    gameActive = false;
    let sec = 5;
    const h = document.getElementById('history-list');
    h.innerHTML = `<li>${res}</li>` + h.innerHTML;
    const t = setInterval(() => {
        document.getElementById('countdown').innerText = `${res} - Reset in ${sec}...`;
        if (sec <= 0) { clearInterval(t); resetBoard(); }
        sec--;
    }, 1000);
}

function resetBoard() {
    gameState = Array(9).fill("");
    document.querySelectorAll('.cell').forEach(c => c.innerText = "");
    document.getElementById('countdown').innerText = "";
    gameActive = true; turn = "X"; updateStatus();
}

function switchChat(type) {
    const r = document.getElementById('room-chat-box');
    const l = document.getElementById('lobby-chat-box-game');
    const inp = document.getElementById('room-input');
    const btn = document.getElementById('send-room-btn');
    if(type === 'room') {
        r.style.display = 'block'; l.style.display = 'none';
        inp.disabled = isSpectator; btn.disabled = isSpectator;
    } else {
        r.style.display = 'none'; l.style.display = 'block';
        inp.disabled = false; btn.disabled = false;
    }
    document.getElementById('btn-tab-room').className = type === 'room' ? 'active' : '';
    document.getElementById('btn-tab-lobby').className = type === 'lobby' ? 'active' : '';
}

function sendLobbyMsg() {
    const i = document.getElementById('lobby-input');
    if(i.value) { socket.emit('invio-messaggio-lobby', i.value); i.value = ""; }
}

function sendRoomMsg() {
    const i = document.getElementById('room-input');
    const type = document.getElementById('btn-tab-room').className === 'active' ? 'room' : 'lobby';
    if(!i.value) return;
    if(type === 'room' && !isSpectator) socket.emit('invio-messaggio-stanza', { roomName: currentRoom, text: i.value });
    else if(type === 'lobby') socket.emit('invio-messaggio-lobby', i.value);
    i.value = "";
}