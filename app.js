// --- Globals ---
let players = [];
let currentTeams = [];
let currentMatches = [];
let showStandings = false;
let pendingRound = null;
let isTournamentStarted = false;
let roundNumber = 0;

// --- Player Registration ---
function addPlayer() {
  const div = document.createElement("div");
  div.className = "player-row";
  div.innerHTML = `
    <input placeholder="Name" />
    <select>
      <option value="M">Mann</option>
      <option value="F">Frau</option>
    </select>
  `;
  document.getElementById("playerList").appendChild(div);
}

function updateRoundIndicator() {
  const container = document.getElementById("roundIndicatorContainer");
  const numSpan = document.getElementById("roundNumber");
  if (container && numSpan) {
    if (isTournamentStarted && roundNumber > 0) {
      numSpan.textContent = roundNumber;
      container.style.display = "block";
    } else {
      container.style.display = "none";
    }
  }
}

function startTournament() {
  const rows = document.querySelectorAll(".player-row");
  players = [];
  rows.forEach(row => {
    const name = row.children[0].value.trim();
    const gender = row.children[1].value;
    if (name) players.push({
      name,
      gender,
      stars: 0,
      pointDiff: 0,
      gamesPlayed: 0,
      lastTeammates: [],
      active: true
    });
  });

  if (players.length < 10 || players.length > 36) {
    alert("Bitte zwischen 10 und 36 Spieler registrieren.");
    return;
  }

  // Switch to tournament view
  isTournamentStarted = true;
  roundNumber = 0;
  document.getElementById("playerRegistration").style.display = "none";
  document.getElementById("tournamentControls").style.display = "flex";
  document.getElementById("pageTitle").textContent = "Volleyball-Turnier";

  currentTeams = [];
  currentMatches = [];
  renderStandings();
  document.getElementById("standings").style.display = "none";

  renderTeams();
  renderMatches();
  updateRoundIndicator();
  saveTournamentState();
}

// --- Team Building ---
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTeamsFromPlayers(playerList, teamCount = 6) {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    id: i + 1,
    players: []
  }));

  if (!playerList || playerList.length === 0) {
    return teams;
  }

  // Filter only active players (default active if not specified)
  const activePlayers = playerList.filter(p => p.active !== false);
  if (activePlayers.length === 0) {
    return teams;
  }

  // Separate active players by gender and shuffle each group
  const men = shuffle(activePlayers.filter(p => p.gender === "M"));
  const women = shuffle(activePlayers.filter(p => p.gender === "F"));
  const others = shuffle(activePlayers.filter(p => p.gender !== "M" && p.gender !== "F"));

  let teamIndex = Math.floor(Math.random() * teamCount);

  // Distribute men evenly across teams
  men.forEach(player => {
    teams[teamIndex].players.push(player);
    teamIndex = (teamIndex + 1) % teamCount;
  });

  // Distribute women evenly across teams, continuing round-robin to balance total team sizes
  women.forEach(player => {
    teams[teamIndex].players.push(player);
    teamIndex = (teamIndex + 1) % teamCount;
  });

  // Distribute any other players evenly
  others.forEach(player => {
    teams[teamIndex].players.push(player);
    teamIndex = (teamIndex + 1) % teamCount;
  });

  return teams;
}

function buildTeams() {
  currentTeams = buildTeamsFromPlayers(players, 6);
}

// --- Start a Round ---
function startRound() {
  document.getElementById("startRoundModal").style.display = "flex";
}

// Called if confirmed
function confirmStartRound() {
  document.getElementById("startRoundModal").style.display = "none";
  roundNumber++;
  buildTeams();

  currentMatches = [
    [currentTeams[0], currentTeams[1]],
    [currentTeams[2], currentTeams[3]],
    [currentTeams[4], currentTeams[5]]
  ];

  renderTeams();
  renderMatches();
  updateRoundIndicator();
  document.getElementById("saveAllButton").style.display = "inline-block";

  // Hide standings temporarily
  document.getElementById("standings").style.display = "none";
  showStandings = false;
  saveTournamentState();
}

// Called if canceled
function cancelStartRound() {
  document.getElementById("startRoundModal").style.display = "none";
}

// --- Rendering ---
function renderTeams() {
  const teamsDiv = document.getElementById("teams");
  if (!teamsDiv) return;
  teamsDiv.style.display = currentTeams.length > 0 ? "block" : "none";
  const teamsTitle = document.getElementById("teamsTitle");
  if (teamsTitle) teamsTitle.style.display = currentTeams.length > 0 ? "block" : "none";

  teamsDiv.innerHTML =
    currentTeams.map(t => `
      <div class="team">
        <strong>Team ${t.id}</strong><br>
        ${t.players.map((p, i) => `
          <span class="player-num">${i + 1}.</span> <span class="${p.gender === "M" ? 'men' : 'women'}">${p.name}</span>
        `).join("<br>")}
      </div>
    `).join("");
}

function renderMatches() {
  const matchesDiv = document.getElementById("matches");
  if (!matchesDiv) return;
  matchesDiv.style.display = currentMatches.length > 0 ? "block" : "none";
  const matchesTitle = document.getElementById("matchesTitle");
  if (matchesTitle) matchesTitle.style.display = currentMatches.length > 0 ? "block" : "none";

  matchesDiv.innerHTML =
    currentMatches.map((m, i) => `
      <div class="match">
        Team ${m[0].id} <input id="a${i}" type="number" min="0" placeholder="0" />
        :
        <input id="b${i}" type="number" min="0" placeholder="0" />
        Team ${m[1].id}
      </div>
    `).join("");
}

function sortStandings(playerList) {
  return [...playerList].sort(
    (a, b) => b.stars - a.stars || b.pointDiff - a.pointDiff
  );
}

function getRankedStandings(playerList) {
  if (!playerList || playerList.length === 0) return [];
  const sorted = sortStandings(playerList);
  const total = sorted.length;

  let currentRank = 1;
  const ranked = [];

  for (let i = 0; i < total; i++) {
    if (i > 0) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      // If exact same standing (same stars and same pointDiff)
      if (curr.stars === prev.stars && curr.pointDiff === prev.pointDiff) {
        // Shared place (keep currentRank the same)
      } else {
        // Standard competition ranking (e.g. 1, 2, 2, 4...)
        currentRank = i + 1;
      }
    }
    ranked.push({
      ...sorted[i],
      rank: currentRank
    });
  }

  // Count occurrences of each rank to identify ties
  const rankCounts = {};
  ranked.forEach(p => {
    rankCounts[p.rank] = (rankCounts[p.rank] || 0) + 1;
  });

  const topRank = ranked[0].rank;
  const bottomRank = ranked[total - 1].rank;

  return ranked.map(p => ({
    ...p,
    isTied: rankCounts[p.rank] > 1,
    isFirst: p.rank === topRank,
    isLast: p.rank === bottomRank
  }));
}

function renderStandings() {
  const ranked = getRankedStandings(players);

  document.getElementById("standings").innerHTML = `
    <h2>Tabelle</h2>
    <table>
      <thead>
        <tr><th>Rang</th><th>Name</th><th>Sterne</th><th>Diff</th></tr>
      </thead>
      <tbody>
        ${ranked.map(p => `
          <tr style="${p.active === false ? 'opacity: 0.6; font-style: italic;' : ''}">
            <td>#${p.rank}${p.isTied ? ' (Gleichstand)' : ''}</td>
            <td>${p.name}${p.active === false ? ' (inaktiv)' : ''}</td>
            <td>${p.stars}</td>
            <td>${p.pointDiff > 0 ? '+' + p.pointDiff : p.pointDiff}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// --- Save All Matches with confirmation ---
function saveAllMatches() {
  const scores = [];
  for (let i = 0; i < currentMatches.length; i++) {
    const a = Number(document.getElementById(`a${i}`).value);
    const b = Number(document.getElementById(`b${i}`).value);
    if (isNaN(a) || isNaN(b)) {
      alert("Bitte gültige Spielergebnisse für alle Begegnungen eingeben.");
      return;
    }
    scores.push({ a, b });
  }

  // Store pending round
  pendingRound = scores;

  // Show modal
  const detailsDiv = document.getElementById("confirmDetails");
  let html = "";
  currentMatches.forEach((m, i) => {
    html += `
      <strong>Spiel ${i+1}:</strong><br>
      Team ${m[0].id}: ${m[0].players.map(p => p.name).join(", ")} - Punkte: ${scores[i].a}<br>
      Team ${m[1].id}: ${m[1].players.map(p => p.name).join(", ")} - Punkte: ${scores[i].b}<br><br>
    `;
  });
  detailsDiv.innerHTML = html;
  document.getElementById("confirmModal").style.display = "flex";
}

// --- Confirm save all ---
function applyRoundScores(matches, scores) {
  matches.forEach((m, i) => {
    const { a, b } = scores[i];
    let sA = 0, sB = 0;
    if (a > b) sA = 2;
    else if (b > a) sB = 2;
    else sA = sB = 1;

    m[0].players.forEach(p => {
      p.stars += sA;
      p.pointDiff += a - b;
      p.gamesPlayed++;
      p.lastTeammates = m[0].players.map(x => x.name);
    });

    m[1].players.forEach(p => {
      p.stars += sB;
      p.pointDiff += b - a;
      p.gamesPlayed++;
      p.lastTeammates = m[1].players.map(x => x.name);
    });
  });
}

function confirmSaveAll() {
  if (!pendingRound) return;

  applyRoundScores(currentMatches, pendingRound);

  currentMatches.forEach((m, i) => {
    const aInput = document.getElementById(`a${i}`);
    const bInput = document.getElementById(`b${i}`);
    if (aInput) aInput.value = "";
    if (bInput) bInput.value = "";
  });

  renderStandings();

  document.getElementById("confirmModal").style.display = "none";
  pendingRound = null;
  saveTournamentState();
}

// --- Discard modal ---
function discardSaveAll() {
  document.getElementById("confirmModal").style.display = "none";
  pendingRound = null;
}

// --- Toggle standings ---
function toggleStandings() {
  showStandings = !showStandings;
  document.getElementById("standings").style.display =
    showStandings ? "block" : "none";
}

// --- In-Tournament Player Management (Add / Remove) ---
function addNewPlayer(playerList, { name, gender }) {
  if (!name || !name.trim()) {
    throw new Error("Spielername ist erforderlich.");
  }
  const trimmedName = name.trim();
  const existingPlayer = playerList.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
  if (existingPlayer) {
    if (existingPlayer.active !== false) {
      throw new Error(`Ein Spieler mit dem Namen "${trimmedName}" existiert bereits.`);
    }
    // Reactivate previously removed player while preserving their accumulated stats
    return playerList.map(p => {
      if (p.name.toLowerCase() === trimmedName.toLowerCase()) {
        return { ...p, active: true, gender: gender === "F" ? "F" : (gender === "M" ? "M" : p.gender) };
      }
      return p;
    });
  }
  const newPlayer = {
    name: trimmedName,
    gender: gender === "F" ? "F" : "M",
    stars: 0,
    pointDiff: 0,
    gamesPlayed: 0,
    lastTeammates: [],
    active: true
  };
  return [...playerList, newPlayer];
}

function removePlayer(playerList, playerName) {
  return playerList.map(p => {
    if (p.name === playerName) {
      return { ...p, active: false };
    }
    return p;
  });
}

function openAddPlayerModal() {
  document.getElementById("newPlayerName").value = "";
  document.getElementById("newPlayerGender").value = "M";
  document.getElementById("addPlayerModal").style.display = "flex";
}

function closeAddPlayerModal() {
  document.getElementById("addPlayerModal").style.display = "none";
}

function confirmAddPlayer() {
  const name = document.getElementById("newPlayerName").value.trim();
  const gender = document.getElementById("newPlayerGender").value;

  if (!name) {
    alert("Bitte einen Spielernamen eingeben.");
    return;
  }
  if (players.length >= 36) {
    alert("Maximal 36 Spieler erreicht.");
    return;
  }
  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert(`Ein Spieler mit dem Namen "${name}" existiert bereits.`);
    return;
  }

  players = addNewPlayer(players, { name, gender });
  renderStandings();
  closeAddPlayerModal();
  saveTournamentState();
}

function openRemovePlayerModal() {
  const activePlayers = players.filter(p => p.active !== false);
  if (activePlayers.length === 0) {
    alert("Keine aktiven Spieler registriert.");
    return;
  }
  const select = document.getElementById("removePlayerSelect");
  select.innerHTML = activePlayers.map(p => `
    <option value="${p.name}">${p.name} (${p.gender === "M" ? "Mann" : "Frau"} - Sterne: ${p.stars}, Diff: ${p.pointDiff > 0 ? '+' + p.pointDiff : p.pointDiff})</option>
  `).join("");

  document.getElementById("removePlayerModal").style.display = "flex";
}

function closeRemovePlayerModal() {
  document.getElementById("removePlayerModal").style.display = "none";
}

function confirmRemovePlayer() {
  const activePlayers = players.filter(p => p.active !== false);
  if (activePlayers.length <= 10) {
    alert("Spieler kann nicht entfernt werden: Mindestens 10 aktive Spieler für 6 Teams erforderlich.");
    return;
  }

  const select = document.getElementById("removePlayerSelect");
  const selectedName = select.value;
  if (!selectedName) return;

  players = removePlayer(players, selectedName);
  renderStandings();
  closeRemovePlayerModal();
  saveTournamentState();
}

// --- Evaluation & Presentation Mode (Backwards Standings with Shared Ranks) ---
function getPresentationStandings(playerList) {
  const ranked = getRankedStandings(playerList);
  return [...ranked].reverse();
}

let evaluationIndex = 0;
let evaluationItems = [];

function startEvaluation() {
  if (players.length === 0) {
    alert("Keine Spieler registriert.");
    return;
  }

  evaluationItems = getPresentationStandings(players);
  evaluationIndex = 0;

  document.getElementById("tournamentControls").style.display = "none";
  const roundCont = document.getElementById("roundIndicatorContainer");
  if (roundCont) roundCont.style.display = "none";
  document.getElementById("teamsTitle").style.display = "none";
  document.getElementById("teams").style.display = "none";
  document.getElementById("matchesTitle").style.display = "none";
  document.getElementById("matches").style.display = "none";
  document.getElementById("saveAllButton").style.display = "none";
  document.getElementById("standings").style.display = "none";

  document.getElementById("pageTitle").textContent = "Siegerehrung";
  document.getElementById("evaluationView").style.display = "block";
  document.getElementById("evaluationStartScreen").style.display = "block";
  document.getElementById("evaluationSpotlight").style.display = "none";
  document.getElementById("evaluationTableContainer").style.display = "none";
}

function beginSpotlightPresentation() {
  document.getElementById("evaluationStartScreen").style.display = "none";
  document.getElementById("evaluationTableContainer").style.display = "none";
  document.getElementById("evaluationSpotlight").style.display = "block";
  evaluationIndex = 0;
  renderSpotlightCard();
}

function renderSpotlightCard() {
  if (evaluationIndex >= evaluationItems.length) {
    showFinalStandingsTable();
    return;
  }

  const p = evaluationItems[evaluationIndex];
  const spotlightDiv = document.getElementById("spotlightCard");

  spotlightDiv.className = `spotlight-card ${p.isFirst ? 'award-first' : ''} ${p.isLast ? 'award-last' : ''}`;

  let badgeHtml = "";
  let awardTitleHtml = "";
  if (p.isFirst) {
    badgeHtml = "🏆";
    awardTitleHtml = `<div class="spotlight-award-title trophy">🏆 1. Platz${p.isTied ? ' (Gleichstand)' : ''} - Turniersieger!</div>`;
  } else if (p.isLast) {
    badgeHtml = "🏮";
    awardTitleHtml = `<div class="spotlight-award-title lantern">🏮 Rote Laterne${p.isTied ? ' (Gleichstand)' : ''}</div>`;
  }

  const rankDisplay = p.isTied ? `Platz #${p.rank} (Gleichstand)` : `Platz #${p.rank} von ${evaluationItems.length}`;

  spotlightDiv.innerHTML = `
    <div class="spotlight-badge-container">${badgeHtml}</div>
    <div class="spotlight-rank">${rankDisplay}</div>
    <div class="spotlight-name ${p.gender === 'M' ? 'men' : 'women'}">
      ${p.name} ${p.active === false ? '<span style="font-size:18px; opacity:0.7;">(inaktiv)</span>' : ''}
    </div>
    <div class="spotlight-score-box">
      ⭐ ${p.stars} Sterne &nbsp;|&nbsp; Diff: ${p.pointDiff > 0 ? '+' + p.pointDiff : p.pointDiff}
    </div>
    ${awardTitleHtml}
  `;

  // Update navigation buttons
  const prevBtn = document.getElementById("prevSpotlightBtn");
  const nextBtn = document.getElementById("nextSpotlightBtn");

  if (prevBtn) {
    // Previous button on the first presented player goes back to start screen
    prevBtn.disabled = false;
    prevBtn.textContent = evaluationIndex === 0 ? "← Startseite" : "← Zurück";
  }
  if (nextBtn) {
    if (evaluationIndex === evaluationItems.length - 1) {
      nextBtn.textContent = "Gesamttabelle anzeigen →";
    } else {
      nextBtn.textContent = `Nächster Spieler (#${evaluationItems[evaluationIndex + 1]?.rank}) →`;
    }
  }
}

function nextEvaluationPlayer() {
  if (evaluationIndex < evaluationItems.length - 1) {
    evaluationIndex++;
    renderSpotlightCard();
  } else {
    showFinalStandingsTable();
  }
}

function prevEvaluationPlayer() {
  if (evaluationIndex > 0) {
    evaluationIndex--;
    renderSpotlightCard();
  } else {
    // Return to start screen
    document.getElementById("evaluationSpotlight").style.display = "none";
    document.getElementById("evaluationStartScreen").style.display = "block";
  }
}

function showFinalStandingsTable() {
  document.getElementById("evaluationStartScreen").style.display = "none";
  document.getElementById("evaluationSpotlight").style.display = "none";
  document.getElementById("evaluationTableContainer").style.display = "block";

  // Normal order: 1st place at the top
  const ranked = getRankedStandings(players);

  const tableHtml = `
    <table>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Name</th>
          <th>Sterne</th>
          <th>Diff</th>
          <th>Auszeichnung</th>
        </tr>
      </thead>
      <tbody>
        ${ranked.map(p => `
          <tr style="${p.isFirst ? 'background: #FFF8DC; font-weight: bold;' : ''} ${p.isLast ? 'background: #FFF0F0;' : ''} ${p.active === false ? 'opacity: 0.6; font-style: italic;' : ''}">
            <td>#${p.rank}${p.isTied ? ' (Gleichstand)' : ''}</td>
            <td class="${p.gender === 'M' ? 'men' : 'women'}">
              ${p.name} ${p.active === false ? '(inaktiv)' : ''}
            </td>
            <td>${p.stars}</td>
            <td>${p.pointDiff > 0 ? '+' + p.pointDiff : p.pointDiff}</td>
            <td>
              ${p.isFirst ? '<span class="trophy-badge">🏆 1. Platz</span>' : ''}
              ${p.isLast ? '<span class="lantern-badge">🏮 Rote Laterne</span>' : ''}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("finalStandingsTable").innerHTML = tableHtml;
}

function restartEvaluation() {
  document.getElementById("evaluationTableContainer").style.display = "none";
  document.getElementById("evaluationStartScreen").style.display = "block";
}

function exitEvaluation() {
  document.getElementById("evaluationView").style.display = "none";
  document.getElementById("tournamentControls").style.display = "flex";
  updateRoundIndicator();
  const teamsTitle = document.getElementById("teamsTitle");
  const teamsDiv = document.getElementById("teams");
  const matchesTitle = document.getElementById("matchesTitle");
  const matchesDiv = document.getElementById("matches");
  if (teamsTitle) teamsTitle.style.display = currentTeams.length > 0 ? "block" : "none";
  if (teamsDiv) teamsDiv.style.display = currentTeams.length > 0 ? "block" : "none";
  if (matchesTitle) matchesTitle.style.display = currentMatches.length > 0 ? "block" : "none";
  if (matchesDiv) matchesDiv.style.display = currentMatches.length > 0 ? "block" : "none";
  if (currentMatches.length > 0) {
    document.getElementById("saveAllButton").style.display = "inline-block";
  }
  document.getElementById("pageTitle").textContent = "Volleyball-Turnier";
}

// --- LocalStorage Persistence & Tournament Reset ---
const STORAGE_KEY = "volleyball_tournament_state";

function saveTournamentState() {
  if (typeof localStorage === "undefined") return;
  try {
    const state = {
      isTournamentStarted,
      roundNumber,
      players,
      currentTeams,
      currentMatches
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

function loadTournamentState() {
  if (typeof localStorage === "undefined") return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    const state = JSON.parse(saved);
    if (!state || !state.isTournamentStarted || !Array.isArray(state.players) || state.players.length === 0) {
      return false;
    }

    players = state.players;
    currentTeams = state.currentTeams || [];
    currentMatches = state.currentMatches || [];
    roundNumber = Number(state.roundNumber) || 0;
    isTournamentStarted = true;

    // Switch view to tournament view
    const regView = document.getElementById("playerRegistration");
    const controls = document.getElementById("tournamentControls");
    const teamsTitle = document.getElementById("teamsTitle");
    const matchesTitle = document.getElementById("matchesTitle");
    const pageTitle = document.getElementById("pageTitle");
    const saveBtn = document.getElementById("saveAllButton");
    const standingsDiv = document.getElementById("standings");

    const teamsDiv = document.getElementById("teams");
    const matchesDiv = document.getElementById("matches");

    if (regView) regView.style.display = "none";
    if (controls) controls.style.display = "flex";
    if (teamsTitle) teamsTitle.style.display = currentTeams.length > 0 ? "block" : "none";
    if (teamsDiv) teamsDiv.style.display = currentTeams.length > 0 ? "block" : "none";
    if (matchesTitle) matchesTitle.style.display = currentMatches.length > 0 ? "block" : "none";
    if (matchesDiv) matchesDiv.style.display = currentMatches.length > 0 ? "block" : "none";
    if (pageTitle) pageTitle.textContent = "Volleyball-Turnier";
    if (saveBtn) saveBtn.style.display = currentMatches.length > 0 ? "inline-block" : "none";

    renderStandings();
    if (standingsDiv) standingsDiv.style.display = "none";

    renderTeams();
    renderMatches();
    updateRoundIndicator();
    return true;
  } catch (err) {
    console.warn("Could not load from localStorage:", err);
    return false;
  }
}

function clearTournamentState() {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Could not clear localStorage:", err);
    }
  }
  isTournamentStarted = false;
  roundNumber = 0;
  players = [];
  currentTeams = [];
  currentMatches = [];
  pendingRound = null;
}

function openResetModal() {
  const modal = document.getElementById("resetModal");
  if (modal) modal.style.display = "flex";
}

function closeResetModal() {
  const modal = document.getElementById("resetModal");
  if (modal) modal.style.display = "none";
}

function confirmResetTournament() {
  clearTournamentState();
  closeResetModal();

  // Reset UI back to registration
  document.getElementById("tournamentControls").style.display = "none";
  const roundCont = document.getElementById("roundIndicatorContainer");
  if (roundCont) roundCont.style.display = "none";
  document.getElementById("teamsTitle").style.display = "none";
  document.getElementById("teams").style.display = "none";
  document.getElementById("matchesTitle").style.display = "none";
  document.getElementById("matches").style.display = "none";
  document.getElementById("saveAllButton").style.display = "none";
  document.getElementById("standings").style.display = "none";
  document.getElementById("evaluationView").style.display = "none";

  document.getElementById("playerRegistration").style.display = "block";
  document.getElementById("pageTitle").textContent = "Spieler registrieren";

  // Re-populate default 10 empty player rows
  const playerList = document.getElementById("playerList");
  if (playerList) {
    playerList.innerHTML = "";
    for (let i = 0; i < 10; i++) addPlayer();
  }
}

// Warn on accidental tab close / reload if tournament is active
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (event) => {
    if (isTournamentStarted && players.length > 0) {
      event.preventDefault();
      event.returnValue = "Ein Volleyball-Turnier läuft gerade.";
    }
  });
}

// --- Exports for Node.js / Unit Tests ---
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    shuffle,
    buildTeamsFromPlayers,
    applyRoundScores,
    sortStandings,
    getRankedStandings,
    addNewPlayer,
    removePlayer,
    getPresentationStandings,
    saveTournamentState,
    loadTournamentState,
    clearTournamentState
  };
}
