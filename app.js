let players = JSON.parse(localStorage.getItem("players")).map(p => ({
  ...p,
  stars: 0,
  pointDiff: 0,
  gamesPlayed: 0,
  lastTeammates: []
}));

let currentTeams = [];
let currentMatches = [];
let showStandings = false;

/* ---------- Helpers ---------- */
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function toggleStandings() {
  showStandings = !showStandings;
  document.getElementById("standings").style.display =
    showStandings ? "block" : "none";
}

/* ---------- Team Builder ---------- */
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

/* ---------- Round ---------- */
function startRound() {
  buildTeams();

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
  document.getElementById("teams").innerHTML =
    currentTeams.map(t => `
      <div class="team">
        <strong>Team ${t.id}</strong><br>
        ${t.players.map(p => p.name).join("<br>")}
      </div>
    `).join("");
}

function renderMatches() {
  document.getElementById("matches").innerHTML =
    currentMatches.map((m, i) => `
      <div class="match">
        Team ${m[0].id}
        <input id="a${i}">
        :
        <input id="b${i}">
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

/* ---------- Match result ---------- */
function finishMatch(i) {
  const [A, B] = currentMatches[i];
  const a = Number(document.getElementById(`a${i}`).value);
  const b = Number(document.getElementById(`b${i}`).value);

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
  renderMatches(); // clears inputs
}
