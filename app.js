
// --- Globals ---
let players = [];
let currentTeams = [];
let currentMatches = [];
let showStandings = false;
let pendingMatch = null;

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

  // Clear previous data
  currentTeams = [];
  currentMatches = [];
  renderStandings();
  document.getElementById("standings").style.display = "none";

  renderTeams();
  renderMatches();
}

// --- Team Building ---
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function buildTeams() {
  const men = shuffle(players.filter(p => p.gender === "M"));
  const women = shuffle(players.filter(p => p.gender === "F"));

  currentTeams = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    players: [],
    menSlots: 0,
    womenSlots: 0
  }));

  const menBase = Math.floor(men.length / 6);
  const womenBase = Math.floor(women.length / 6);
  let extraMen = men.length % 6;
  let extraWomen = women.length % 6;

  currentTeams.forEach(t => {
    t.menSlots = menBase + (extraMen-- > 0 ? 1 : 0);
    t.womenSlots = womenBase + (extraWomen-- > 0 ? 1 : 0);
  });

  function penalty(player, team) {
    return team.players.reduce(
      (sum, p) => sum + (player.lastTeammates.includes(p.name) ? 10 : 0),
      0
    );
  }

  function assign(pool, slotKey) {
    pool.forEach(player => {
      let best = null;
      let bestScore = Infinity;

      currentTeams.forEach(team => {
        if (team[slotKey] <= 0) return;
        const score = penalty(player, team);
        if (score < bestScore) {
          bestScore = score;
          best = team;
        }
      });

      if (best) {
        best.players.push(player);
        best[slotKey]--;
      }
    });
  }

  assign(women, "womenSlots");
  assign(men, "menSlots");

  currentTeams.forEach(t => {
    delete t.menSlots;
    delete t.womenSlots;
  });
}

// --- Start a Round ---
function startRound() {
  buildTeams();

  currentMatches = [
    [currentTeams[0], currentTeams[1]],
    [currentTeams[2], currentTeams[3]],
    [currentTeams[4], currentTeams[5]]
  ];

  renderTeams();
  renderMatches();

  // Hide standings
  document.getElementById("standings").style.display = "none";
  showStandings = false;
}

// --- Rendering ---
function renderTeams() {
  document.getElementById("teams").innerHTML =
    currentTeams.map(t => `
      <div class="team">
        <strong>Team ${t.id}</strong><br>
        ${t.players.map(p => `${p.name} (${p.gender})`).join("<br>")}
      </div>
    `).join("");
}

function renderMatches() {
  document.getElementById("matches").innerHTML =
    currentMatches.map((m, i) => `
      <div class="match">
        Team ${m[0].id}
        <input id="a${i}" type="number" min="0" placeholder="0" />
        :
        <input id="b${i}" type="number" min="0" placeholder="0" />
        Team ${m[1].id}
        <button onclick="finishMatch(${i})">Save</button>
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

// --- Finish match and show confirmation ---
function finishMatch(i) {
  const [A, B] = currentMatches[i];
  const a = Number(document.getElementById(`a${i}`).value);
  const b = Number(document.getElementById(`b${i}`).value);

  if (isNaN(a) || isNaN(b)) {
    alert("Please enter valid scores");
    return;
  }

  // Store pending match
  pendingMatch = { index: i, A, B, a, b };

  // Show modal
  const detailsDiv = document.getElementById("confirmDetails");
  detailsDiv.innerHTML = `
    <strong>Team ${A.id}:</strong> ${A.players.map(p => p.name).join(", ")} <br>
    <strong>Score:</strong> ${a} <br><br>
    <strong>Team ${B.id}:</strong> ${B.players.map(p => p.name).join(", ")} <br>
    <strong>Score:</strong> ${b}
  `;
  document.getElementById("confirmModal").style.display = "flex";
}

// --- Confirm modal save ---
function confirmSave() {
  if (!pendingMatch) return;

  const { A, B, a, b } = pendingMatch;

  let sA = 0, sB = 0;
  if (a > b) sA = 2;
  else if (b > a) sB = 2;
  else sA = sB = 1;

  A.players.forEach(p => {
    p.stars += sA;
    p.pointDiff += a - b;
    p.gamesPlayed++;
    p.lastTeammates = A.players.map(x => x.name);
  });

  B.players.forEach(p => {
    p.stars += sB;
    p.pointDiff += b - a;
    p.gamesPlayed++;
    p.lastTeammates = B.players.map(x => x.name);
  });

  renderStandings();

  // Clear inputs
  document.getElementById(`a${pendingMatch.index}`).value = "";
  document.getElementById(`b${pendingMatch.index}`).value = "";

  document.getElementById("confirmModal").style.display = "none";
  pendingMatch = null;
}

// --- Discard modal ---
function discardSave() {
  document.getElementById("confirmModal").style.display = "none";
  pendingMatch = null;
}

// --- Toggle standings ---
function toggleStandings() {
  showStandings = !showStandings;
  document.getElementById("standings").style.display =
    showStandings ? "block" : "none";
}
