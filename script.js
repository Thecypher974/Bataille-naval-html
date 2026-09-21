const TYPES_BATEAUX = [
    { nom: "Porte-avion", taille: 4, id: "ship-4" },
    { nom: "Frégate", taille: 3, id: "ship-3a" },
    { nom: "Patrouilleur", taille: 3, id: "ship-3b" },
    { nom: "Chasseur de mines", taille: 2, id: "ship-2" },
    { nom: "Sous-marin", taille: 1, id: "ship-1" }
];

let phase = "PLACEMENT";
let orientation = "H";
let bateauActuelIndex = 0;

let flotteRobot = [];
let flotteJoueur = [];
let ciblesEnAttente = [];

const playerBoardEl = document.getElementById("player-board");
const robotBoardEl = document.getElementById("robot-board");
const statusMsg = document.getElementById("status-message");

// Initialisation
function initGame() {
    playerBoardEl.innerHTML = "";
    robotBoardEl.innerHTML = "";
    flotteRobot = [];
    flotteJoueur = [];
    ciblesEnAttente = [];
    bateauActuelIndex = 0;
    phase = "PLACEMENT";

    TYPES_BATEAUX.forEach(b => {
        document.getElementById(b.id).classList.remove("placed");
    });

    for (let i = 0; i < 100; i++) {
        const cellP = document.createElement("div");
        cellP.classList.add("cell");
        cellP.dataset.index = i;
        cellP.addEventListener("click", () => placerBateauJoueur(i));
        playerBoardEl.appendChild(cellP);

        const cellR = document.createElement("div");
        cellR.classList.add("cell");
        cellR.dataset.index = i;
        cellR.addEventListener("click", () => effectuerTir(i));
        robotBoardEl.appendChild(cellR);
    }

    placementAutoRobot();
    statusMsg.innerText = "Placez votre " + TYPES_BATEAUX[0].nom + " (" + TYPES_BATEAUX[0].taille + " cases)";
}

function toggleOrientation() {
    orientation = orientation === "H" ? "V" : "H";
    document.getElementById("btn-orientation").innerText = "Orientation: " + (orientation === "H" ? "Horizontale" : "Verticale");
}

function genererBateau(taille, grilleOccupee) {
    let placed = false;
    while (!placed) {
        let ori = Math.random() < 0.5 ? "H" : "V";
        let pos = Math.floor(Math.random() * 100);
        let ligne = Math.floor(pos / 10);
        let col = pos % 10;
        let indices = [];

        if (ori === "H" && col + taille <= 10) {
            for (let i = 0; i < taille; i++) indices.push(pos + i);
        } else if (ori === "V" && ligne + taille <= 10) {
            for (let i = 0; i < taille; i++) indices.push(pos + i * 10);
        }

        if (indices.length > 0 && indices.every(i => !grilleOccupee.has(i))) {
            indices.forEach(i => grilleOccupee.add(i));
            return { indices: indices, touches: new Array(taille).fill(false) };
        }
    }
}

function placementAutoRobot() {
    let grilleOccupee = new Set();
    TYPES_BATEAUX.forEach(b => {
        let bat = genererBateau(b.taille, grilleOccupee);
        flotteRobot.push({ nom: b.nom, ...bat });
    });
}

function placerBateauJoueur(index) {
    if (phase !== "PLACEMENT" || bateauActuelIndex >= TYPES_BATEAUX.length) return;

    let bInfo = TYPES_BATEAUX[bateauActuelIndex];
    let taille = bInfo.taille;
    let ligne = Math.floor(index / 10);
    let col = index % 10;
    let indices = [];

    if (orientation === "H" && col + taille <= 10) {
        for (let i = 0; i < taille; i++) indices.push(index + i);
    } else if (orientation === "V" && ligne + taille <= 10) {
        for (let i = 0; i < taille; i++) indices.push(index + i * 10);
    }

    let occupes = flotteJoueur.flatMap(b => b.indices);
    if (indices.length === 0 || indices.some(i => occupes.includes(i))) {
        statusMsg.innerText = "Placement invalide !";
        return;
    }

    flotteJoueur.push({ nom: bInfo.nom, indices: indices, touches: new Array(taille).fill(false) });
    indices.forEach(i => playerBoardEl.children[i].classList.add("ship"));
    document.getElementById(bInfo.id).classList.add("placed");

    bateauActuelIndex++;
    if (bateauActuelIndex < TYPES_BATEAUX.length) {
        statusMsg.innerText = "Placez votre " + TYPES_BATEAUX[bateauActuelIndex].nom;
    } else {
        lancerCombat();
    }
}

function placementAleatoireJoueur() {
    if (phase !== "PLACEMENT") return;
    flotteJoueur = [];
    Array.from(playerBoardEl.children).forEach(c => c.className = "cell");

    let grilleOccupee = new Set();
    TYPES_BATEAUX.forEach(b => {
        let bat = genererBateau(b.taille, grilleOccupee);
        flotteJoueur.push({ nom: b.nom, ...bat });
        bat.indices.forEach(i => playerBoardEl.children[i].classList.add("ship"));
        document.getElementById(b.id).classList.add("placed");
    });
    lancerCombat();
}

function lancerCombat() {
    phase = "COMBAT";
    statusMsg.innerText = "Phase de combat ! À vous de tirer.";
}

function effectuerTir(index) {
    if (phase !== "COMBAT") return;
    let cell = robotBoardEl.children[index];
    if (cell.classList.contains("hit") || cell.classList.contains("miss")) return;

    let touche = false;
    flotteRobot.forEach(b => {
        let idxInShip = b.indices.indexOf(index);
        if (idxInShip !== -1) {
            touche = true;
            b.touches[idxInShip] = true;
            cell.classList.add("hit");
            cell.innerText = "X";
            let coule = b.touches.every(t => t);
            statusMsg.innerText = coule ? `TOUCHÉ COULÉ ! Vous avez détruit le ${b.nom} !` : "TOUCHÉ !";
        }
    });

    if (!touche) {
        cell.classList.add("miss");
        statusMsg.innerText = "À côté !";
    }

    if (!verifierVictoire()) {
        setTimeout(tourRobot, 800);
    }
}

function tourRobot() {
    let pos = null;

    while (ciblesEnAttente.length > 0) {
        let candidate = ciblesEnAttente.shift();
        let cell = playerBoardEl.children[candidate];
        if (!cell.classList.contains("hit") && !cell.classList.contains("miss")) {
            pos = candidate;
            break;
        }
    }

    if (pos === null) {
        do {
            pos = Math.floor(Math.random() * 100);
        } while (playerBoardEl.children[pos].classList.contains("hit") || playerBoardEl.children[pos].classList.contains("miss"));
    }

    let cell = playerBoardEl.children[pos];
    let touche = false;

    flotteJoueur.forEach(b => {
        let idxInShip = b.indices.indexOf(pos);
        if (idxInShip !== -1) {
            touche = true;
            b.touches[idxInShip] = true;
            cell.classList.add("hit");
            cell.innerText = "X";
            
            let l = Math.floor(pos / 10), c = pos % 10;
            let voisins = [];
            if (l > 0) voisins.push(pos - 10);
            if (l < 9) voisins.push(pos + 10);
            if (c > 0) voisins.push(pos - 1);
            if (c < 9) voisins.push(pos + 1);
            
            voisins.forEach(v => {
                if (!ciblesEnAttente.includes(v)) ciblesEnAttente.push(v);
            });
        }
    });

    if (!touche) {
        cell.classList.add("miss");
    }

    verifierVictoire();
}

function verifierVictoire() {
    let robotVivant = flotteRobot.some(b => b.touches.some(t => !t));
    let joueurVivant = flotteJoueur.some(b => b.touches.some(t => !t));

    if (!robotVivant) {
        phase = "FIN";
        afficherModal("VICTOIRE !", true);
        return true;
    }
    if (!joueurVivant) {
        phase = "FIN";
        afficherModal("DÉFAITE...", false);
        return true;
    }
    return false;
}

function afficherModal(titre, vic) {
    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("modal-title").innerText = titre;
    document.getElementById("modal-title").style.color = vic ? "#a6e3a1" : "#f38ba8";
    
    // Animation Canvas (Feu d'artifice / Naufrage)
    const canvas = document.getElementById("anim-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = vic ? "#1e1e2e" : "#0b1d3a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function restartGame() {
    document.getElementById("modal-overlay").classList.add("hidden");
    initGame();
}

initGame();