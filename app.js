let players = [];
let currentTeams = [];
let currentMatches = [];

/* ---------- Helpers ---------- */
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

/* ---------- Initialization ---------- */
function initPlayers(names) {
  players = names.map(name => ({
    name,
    stars: 0,
    pointDiff: 0,
    gamesPlayed: 0
  }));
}

/* ---------- Round Logic ---------- */
function startRound() {
  if (players.length === 0) {
    const names = document
      .getElementById("playersInput")
      .value.split(",")
      .map(n => n.trim())
      .filter(Boolean);

    if (names.length < 10 || names.length > 30) {
      alert("Please enter between 10 and 30 players.");
      return;
    }

    initPlayers(names);
  }

  // Create teams
  const shuffled = shuffle([...players]);
  currentTeams = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    players: []
  }));

  shuffled.forEach((p, i) => {
    currentTeams[i % 6].players.push(p);
  });

  // Create matches
  currentMatches = [
    [currentTeams[0], currentTeams[1]],
    [currentTeams[2], currentTeams[3]],
    [currentTeams[4], currentTeams[5]]
  ];

  renderTeams();
  renderMatches();
}

/* ---------- Rendering ---------- */
function renderTeams() {
  const div = document.getElementById("teams");
  div.innerHTML = "";

  currentTeams.forEach(team => {
    div.innerHTML += `
      <div class="team">
        <strong>Team ${team.id}</strong><br>
        ${team.players.map(p => p.name).join("<br>")}
      </div>
    `;
  });
}

function renderMatches() {
  const div = document.getElementById("matches");
  div.innerHTML = "";

  currentMatches.forEach((m, i) => {
    div.innerHTML += `
      <div>
        Team ${m[0].id} vs Team ${m[1].id}
        <input id="a${i}" type="number" value="21">
        :
        <input id="b${i}" type="number" value="18">
        <button onclick="finishMatch(${i})">Save</button>
      </div>
    `;
  });
}

function renderStandings() {
  const div = document.getElementById("standings");

  const sorted = [...players].sort(
    (a, b) => b.stars - a.stars || b.pointDiff - a.pointDiff
  );

  div.innerHTML = `
    <h3>Standings</h3>
    <table>
      <tr>
        <th>Player</th>
        <th>Stars</th>
        <th>Point Diff</th>
        <th>Games</th>
      </tr>
      ${sorted.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.stars}</td>
          <td>${p.pointDiff}</td>
          <td>${p.gamesPlayed}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

/* ---------- Match Result ---------- */
function finishMatch(i) {
  const [teamA, teamB] = currentMatches[i];
  const scoreA = Number(document.getElementById(`a${i}`).value);
  const scoreB = Number(document.getElementById(`b${i}`).value);

  let starsA = 0, starsB = 0;
  if (scoreA > scoreB) starsA = 2;
  else if (scoreB > scoreA) starsB = 2;
  else starsA = starsB = 1;

  teamA.players.forEach(p => {
    p.stars += starsA;
    p.pointDiff += scoreA - scoreB;
    p.gamesPlayed++;
  });

  teamB.players.forEach(p => {
    p.stars += starsB;
    p.pointDiff += scoreB - scoreA;
    p.gamesPlayed++;
  });

  renderStandings();
}
