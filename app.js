
// --- Globals ---
let players = [];
let currentTeams = [];
let currentMatches = [];
let showStandings = false;
let pendingRound = null;

// --- Player Registration ---
function addPlayer() {
  const div = document.createElement("div");
  div.className = "player-row";
  div.innerHTML = `
    <input placeholder="Name" />
    <select>
      <option value="M">Man</option>
      <option value="F">Woman</option>
    </select>
  `;
  document.getElementById("playerList").appendChild(div);
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
      lastTeammates: []
    });
  });

  if (players.length < 10 || players.length > 30) {
    alert("Please register between 10 and 30 players.");
    return;
  }

  // Switch to tournament view
  document.getElementById("playerRegistration").style.display = "none";
  document.getElementById("tournamentControls").style.display = "block";
  document.getElementById("teamsTitle").style.display = "block";
  document.getElementById("matchesTitle").style.display = "block";
  document.getElementById("pageTitle").textContent = "Volleyball Tournament";

  currentTeams = [];
  currentMatches = [];
  renderStandings();
  document.getElementById("standings").style.display = "none";

  renderTeams();
  renderMatches();
}

// --- Team Building ---
function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }

function buildTeams() {
  const totalPlayers = players.length;
  const baseSize = Math.floor(totalPlayers / 6);
  let extra = totalPlayers % 6;

  // Shuffle players
  const shuffledPlayers = shuffle(players);

  // Initialize 6 empty teams
  currentTeams = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    players: []
  }));

  let teamIndex = 0;

  // Distribute players evenly
  shuffledPlayers.forEach(player => {
    currentTeams[teamIndex].players.push(player);

    // Move to next team
    teamIndex = (teamIndex + 1) % 6;
  });

  // Optional: Ensure gender mix by swapping if any team has all same gender
  // Count men and women per team
  currentTeams.forEach(team => {
    const men = team.players.filter(p => p.gender === "M");
    const women = team.players.filter(p => p.gender === "F");
    if (men.length === 0 || women.length === 0) {
      // Find a player in another team to swap
      for (let other of currentTeams) {
        if (other === team) continue;
        const swapCandidate = other.players.find(p => p.gender !== team.players[0].gender);
        if (swapCandidate) {
          // Swap
          const toSwap = team.players[0];
          team.players[0] = swapCandidate;
          const index = other.players.indexOf(swapCandidate);
          other.players[index] = toSwap;
          break;
        }
      }
    }
  });
}

// --- Start a Round ---
function startRound() {
  document.getElementById("startRoundModal").style.display = "flex";
}

// Called if confirmed
function confirmStartRound() {
  document.getElementById("startRoundModal").style.display = "none";
  buildTeams();

  currentMatches = [
    [currentTeams[0], currentTeams[1]],
    [currentTeams[2], currentTeams[3]],
    [currentTeams[4], currentTeams[5]]
  ];

  renderTeams();
  renderMatches();
  document.getElementById("saveAllButton").style.display = "inline-block";

  // Hide standings temporarily
  document.getElementById("standings").style.display = "none";
  showStandings = false;
}

// Called if canceled
function cancelStartRound() {
  document.getElementById("startRoundModal").style.display = "none";
}

// --- Rendering ---
function renderTeams() {
  document.getElementById("teams").innerHTML =
    currentTeams.map(t => `
      <div class="team">
        <strong>Team ${t.id}</strong><br>
        ${t.players.map(p => `
          <span class="${p.gender === "M" ? 'men' : 'women'}">
            ${p.name}
          </span>
        `).join("<br>")}
      </div>
    `).join("");
}

function renderMatches() {
  document.getElementById("matches").innerHTML =
    currentMatches.map((m, i) => `
      <div class="match">
        Team ${m[0].id} <input id="a${i}" type="number" min="0" placeholder="0" />
        :
        <input id="b${i}" type="number" min="0" placeholder="0" />
        Team ${m[1].id}
      </div>
    `).join("");
}

function renderStandings() {
  const sorted = [...players].sort(
    (a, b) => b.stars - a.stars || b.pointDiff - a.pointDiff
  );

  document.getElementById("standings").innerHTML = `
    <h2>Standings</h2>
    <table>
      <tr><th>Name</th><th>Stars</th><th>Diff</th></tr>
      ${sorted.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.stars}</td>
          <td>${p.pointDiff}</td>
        </tr>
      `).join("")}
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
      alert("Please enter valid scores for all matches.");
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
      <strong>Match ${i+1}:</strong><br>
      Team ${m[0].id}: ${m[0].players.map(p => p.name).join(", ")} - Score: ${scores[i].a}<br>
      Team ${m[1].id}: ${m[1].players.map(p => p.name).join(", ")} - Score: ${scores[i].b}<br><br>
    `;
  });
  detailsDiv.innerHTML = html;
  document.getElementById("confirmModal").style.display = "flex";
}

// --- Confirm save all ---
function confirmSaveAll() {
  if (!pendingRound) return;

  currentMatches.forEach((m, i) => {
    const { a, b } = pendingRound[i];
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

    // Clear inputs
    document.getElementById(`a${i}`).value = "";
    document.getElementById(`b${i}`).value = "";
  });

  renderStandings();

  document.getElementById("confirmModal").style.display = "none";
  pendingRound = null;
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
