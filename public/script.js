let socket;
let mySymbol = "";
let turn = "X";
let gameState = ["", "", "", "", "", "", "", "", ""];
let gameActive = true;

const setupDiv = document.getElementById('setup');
const gameDiv = document.getElementById('game');
const statusText = document.getElementById('status');
const mySymbolText = document.getElementById('my-symbol');
const cells = document.querySelectorAll('.cell');
const chatBox = document.getElementById('chat-box');
const historyList = document.getElementById('history-list');

document.getElementById('connect-btn').onclick = () => {
    socket = io(); // Connessione automatica a Render

    socket.on('assegna-simbolo', (sym) => {
        mySymbol = sym;
        mySymbolText.innerText = "Tu sei: " + (mySymbol || "Spettatore");
        setupDiv.style.display = 'none';
        gameDiv.style.display = 'flex';
        updateStatus();
    });

    socket.on('ricevi-mossa', (data) => {
        updateBoard(data.index, data.player);
        turn = (data.player === "X") ? "O" : "X";
        updateStatus();
    });

    socket.on('nuovo-messaggio', (data) => {
        const msgDiv = document.createElement('div');
        msgDiv.innerHTML = `<b>${data.user}:</b> ${data.text}`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    });
};

cells.forEach(cell => {
    cell.onclick = (e) => {
        const index = e.target.dataset.index;
        if (gameActive && turn === mySymbol && gameState[index] === "") {
            updateBoard(index, mySymbol);
            socket.emit('mossa-fatta', { index, player: mySymbol });
            turn = (mySymbol === "X") ? "O" : "X";
            updateStatus();
        }
    };
});

function updateBoard(index, player) {
    gameState[index] = player;
    cells[index].innerText = player;
    cells[index].classList.add(player.toLowerCase());
    checkWin();
}

function updateStatus() {
    if (gameActive) {
        statusText.innerText = (turn === mySymbol) ? "Tocca a te!" : "Tocca all'avversario...";
        statusText.style.background = (turn === mySymbol) ? "#10b981" : "#334155";
    }
}

function checkWin() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let roundWon = false;
    for (let s of wins) {
        if (gameState[s[0]] && gameState[s[0]] === gameState[s[1]] && gameState[s[0]] === gameState[s[2]]) {
            roundWon = true;
            endGame("Vince " + gameState[s[0]]);
            break;
        }
    }
    if (!roundWon && !gameState.includes("")) endGame("Pareggio!");
}

function endGame(result) {
    gameActive = false;
    statusText.innerText = result + "! Reset in 5s...";
    
    const li = document.createElement('li');
    li.innerText = result + " - " + new Date().toLocaleTimeString();
    historyList.prepend(li);

    setTimeout(() => {
        gameState = ["", "", "", "", "", "", "", "", ""];
        cells.forEach(c => { c.innerText = ""; c.className = "cell"; });
        gameActive = true;
        turn = "X";
        updateStatus();
    }, 5000);
}

document.getElementById('send-chat').onclick = sendMsg;
document.getElementById('chat-msg').onkeypress = (e) => { if(e.key === 'Enter') sendMsg(); };

function sendMsg() {
    const text = document.getElementById('chat-msg').value;
    if(text.trim() !== "") {
        socket.emit('invio-messaggio', { user: mySymbol, text: text });
        document.getElementById('chat-msg').value = "";
    }
}