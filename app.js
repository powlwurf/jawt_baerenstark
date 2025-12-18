let players = [];

// Shuffle helper
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function initPlayers(names) {
  players = names.map(name => ({
    name,
    stars: 0,
    pointDiff: 0,
    gamesPlayed: 0
  }));
}

function startRound() {
  if (players.length === 0) {
    const names = document
      .getElementById("playersInput")
      .value.split(",")
      .map(n => n.trim());
    initPlayers(names);
  }

  const shuffled = shuffle([...players]);
  const teams = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    players: []
  }));

  shuffled.forEach((p, i) => {
    teams[i % 6].players.push(p);
  });

  const matches = [
    [teams[0], teams[1]],
    [teams[2], teams[3]],
    [teams[4], teams[5]]
  ];

  renderMatches(matches);
}

function renderMatches(matches) {
  const div = document.getElementById("matches");
  div.innerHTML = "<h3>Matches</h3>";

  matches.forEach((m, i) => {
    div.innerHTML += `
      <div>
        Team ${m[0].id} vs Team ${m[1].id}
        <input id="a${i}" type="number" value="21" style="width:50px">
        :
        <input id="b${i}" type="number" value="18" style="width:50px">
        <button onclick="finishMatch(${i})">Save</button>
      </div>
    `;
  });

  window.currentMatches = matches;
}

function finishMatch(i) {
  const [teamA, teamB] = currentMatches[i];
  const scoreA = Number(document.getElementById(`a${i}`).value);
  const scoreB = Number(document.getElementById(`b${i}`).value);

  let starsA = 0, starsB = 0;
  if (scoreA > scoreB) starsA = 2;
  else if (scoreA < scoreB) starsB = 2;
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
