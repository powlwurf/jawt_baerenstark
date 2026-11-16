const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
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
} = require("../app.js");

function createMockPlayers(menCount, womenCount) {
  const players = [];
  for (let i = 1; i <= menCount; i++) {
    players.push({
      name: `Man ${i}`,
      gender: "M",
      stars: 0,
      pointDiff: 0,
      gamesPlayed: 0,
      lastTeammates: []
    });
  }
  for (let i = 1; i <= womenCount; i++) {
    players.push({
      name: `Woman ${i}`,
      gender: "F",
      stars: 0,
      pointDiff: 0,
      gamesPlayed: 0,
      lastTeammates: []
    });
  }
  return players;
}

describe("Volleyball Tournament - Unit Tests", () => {
  describe("Team Building & Equal Gender Distribution Requirement", () => {
    it("should distribute men and women equally across all 6 teams with 12 men and 6 women", () => {
      const players = createMockPlayers(12, 6);
      const teams = buildTeamsFromPlayers(players, 6);

      assert.equal(teams.length, 6, "Must create 6 teams");

      teams.forEach((team, index) => {
        const men = team.players.filter(p => p.gender === "M").length;
        const women = team.players.filter(p => p.gender === "F").length;

        assert.equal(men, 2, `Team ${index + 1} should have exactly 2 men`);
        assert.equal(women, 1, `Team ${index + 1} should have exactly 1 woman`);
        assert.equal(team.players.length, 3, `Team ${index + 1} should have 3 players total`);
      });
    });

    it("should distribute men and women as equally as possible when counts are not perfectly divisible (e.g. 11 men, 7 women)", (t) => {
      const players = createMockPlayers(11, 7);
      const teams = buildTeamsFromPlayers(players, 6);

      const menCounts = teams.map(t => t.players.filter(p => p.gender === "M").length);
      const womenCounts = teams.map(t => t.players.filter(p => p.gender === "F").length);
      const totalCounts = teams.map(t => t.players.length);

      const maxMen = Math.max(...menCounts);
      const minMen = Math.min(...menCounts);
      const maxWomen = Math.max(...womenCounts);
      const minWomen = Math.min(...womenCounts);
      const maxTotal = Math.max(...totalCounts);
      const minTotal = Math.min(...totalCounts);

      // Log distribution details into test output
      t.diagnostic(`Men per team:   [${menCounts.join(", ")}] (diff: ${maxMen - minMen})`);
      t.diagnostic(`Women per team: [${womenCounts.join(", ")}] (diff: ${maxWomen - minWomen})`);
      t.diagnostic(`Total per team: [${totalCounts.join(", ")}] (diff: ${maxTotal - minTotal})`);

      assert.ok(maxMen - minMen <= 1, `Difference in men count among teams must be <= 1 (got min: ${minMen}, max: ${maxMen})`);
      assert.ok(maxWomen - minWomen <= 1, `Difference in women count among teams must be <= 1 (got min: ${minWomen}, max: ${maxWomen})`);
      assert.ok(maxTotal - minTotal <= 1, `Difference in total player count must be <= 1 (got min: ${minTotal}, max: ${maxTotal})`);
    });

    it("should assign all registered players to teams without duplicates or losses", () => {
      const players = createMockPlayers(10, 8);
      const teams = buildTeamsFromPlayers(players, 6);

      const assignedPlayers = teams.flatMap(t => t.players);
      assert.equal(assignedPlayers.length, players.length, "Total assigned players must equal input players");

      const uniqueNames = new Set(assignedPlayers.map(p => p.name));
      assert.equal(uniqueNames.size, players.length, "Every player must be assigned exactly once without duplication");
    });

    it("should handle boundary player counts (10 to 36 players) with equal distribution", () => {
      const testCases = [
        { men: 5, women: 5 },   // 10 players
        { men: 10, women: 5 },  // 15 players
        { men: 14, women: 10 }, // 24 players
        { men: 18, women: 12 }, // 30 players
        { men: 20, women: 16 }, // 36 players (boundary)
        { men: 20, women: 0 },  // 20 players (all men)
        { men: 0, women: 18 }   // 18 players (all women)
      ];

      for (const { men, women } of testCases) {
        const players = createMockPlayers(men, women);
        const teams = buildTeamsFromPlayers(players, 6);

        const menCounts = teams.map(t => t.players.filter(p => p.gender === "M").length);
        const womenCounts = teams.map(t => t.players.filter(p => p.gender === "F").length);
        const totalCounts = teams.map(t => t.players.length);

        assert.ok(
          Math.max(...menCounts) - Math.min(...menCounts) <= 1,
          `Men distribution mismatch for (${men}M, ${women}W)`
        );
        assert.ok(
          Math.max(...womenCounts) - Math.min(...womenCounts) <= 1,
          `Women distribution mismatch for (${men}M, ${women}W)`
        );
        assert.ok(
          Math.max(...totalCounts) - Math.min(...totalCounts) <= 1,
          `Total player distribution mismatch for (${men}M, ${women}W)`
        );
      }
    });

    it("should randomly generate 20-40 players with random genders, verify equal distribution over 10 iterations, and log results", (t) => {
      for (let run = 1; run <= 10; run++) {
        // Random total players between 20 and 40 (inclusive)
        const totalCount = Math.floor(Math.random() * (40 - 20 + 1)) + 20;
        // Random split between men and women
        const menCount = Math.floor(Math.random() * (totalCount + 1));
        const womenCount = totalCount - menCount;

        const players = createMockPlayers(menCount, womenCount);
        const teams = buildTeamsFromPlayers(players, 6);

        const menCounts = teams.map(team => team.players.filter(p => p.gender === "M").length);
        const womenCounts = teams.map(team => team.players.filter(p => p.gender === "F").length);
        const totalCounts = teams.map(team => team.players.length);

        const menDiff = Math.max(...menCounts) - Math.min(...menCounts);
        const womenDiff = Math.max(...womenCounts) - Math.min(...womenCounts);
        const totalDiff = Math.max(...totalCounts) - Math.min(...totalCounts);

        const logMsg = `Run #${run.toString().padStart(2, " ")}: ${totalCount} players (${menCount}M, ${womenCount}W) -> Men: [${menCounts.join(",")}] (diff: ${menDiff}), Women: [${womenCounts.join(",")}] (diff: ${womenDiff}), Total: [${totalCounts.join(",")}] (diff: ${totalDiff})`;
        t.diagnostic(logMsg);

        assert.ok(
          menDiff <= 1,
          `Run #${run}: Men distribution difference exceeds 1 for ${menCount} men across 6 teams: [${menCounts.join(", ")}]`
        );
        assert.ok(
          womenDiff <= 1,
          `Run #${run}: Women distribution difference exceeds 1 for ${womenCount} women across 6 teams: [${womenCounts.join(", ")}]`
        );
        assert.ok(
          totalDiff <= 1,
          `Run #${run}: Total player distribution difference exceeds 1 for ${totalCount} players: [${totalCounts.join(", ")}]`
        );
        assert.equal(
          teams.flatMap(team => team.players).length,
          totalCount,
          `Run #${run}: Assigned players count mismatch`
        );
      }
    });
  });

  describe("Match Scoring & Standings", () => {
    it("should award 2 stars to winner, 0 to loser, and update point differentials", () => {
      const playerA = { name: "Alice", gender: "F", stars: 0, pointDiff: 0, gamesPlayed: 0, lastTeammates: [] };
      const playerB = { name: "Bob", gender: "M", stars: 0, pointDiff: 0, gamesPlayed: 0, lastTeammates: [] };

      const team1 = { id: 1, players: [playerA] };
      const team2 = { id: 2, players: [playerB] };
      const matches = [[team1, team2]];
      const scores = [{ a: 25, b: 18 }];

      applyRoundScores(matches, scores);

      assert.equal(playerA.stars, 2);
      assert.equal(playerA.pointDiff, 7);
      assert.equal(playerA.gamesPlayed, 1);

      assert.equal(playerB.stars, 0);
      assert.equal(playerB.pointDiff, -7);
      assert.equal(playerB.gamesPlayed, 1);
    });

    it("should award 1 star to both teams on a tie", () => {
      const playerA = { name: "Alice", gender: "F", stars: 0, pointDiff: 0, gamesPlayed: 0, lastTeammates: [] };
      const playerB = { name: "Bob", gender: "M", stars: 0, pointDiff: 0, gamesPlayed: 0, lastTeammates: [] };

      const team1 = { id: 1, players: [playerA] };
      const team2 = { id: 2, players: [playerB] };
      const matches = [[team1, team2]];
      const scores = [{ a: 20, b: 20 }];

      applyRoundScores(matches, scores);

      assert.equal(playerA.stars, 1);
      assert.equal(playerA.pointDiff, 0);
      assert.equal(playerB.stars, 1);
      assert.equal(playerB.pointDiff, 0);
    });

    it("should sort standings primarily by stars and secondarily by point differential", () => {
      const p1 = { name: "Charlie", stars: 4, pointDiff: 5 };
      const p2 = { name: "Alice", stars: 6, pointDiff: 2 };
      const p3 = { name: "Bob", stars: 4, pointDiff: 10 };

      const sorted = sortStandings([p1, p2, p3]);

      assert.deepEqual(sorted.map(p => p.name), ["Alice", "Bob", "Charlie"]);
    });
  });

  describe("In-Tournament Player Management (Add/Remove without resetting standings)", () => {
    it("should add a new player during tournament with 0 stats while preserving all existing player standings", () => {
      const existingPlayers = [
        { name: "Alice", gender: "F", stars: 4, pointDiff: 12, gamesPlayed: 2, lastTeammates: ["Charlie"] },
        { name: "Bob", gender: "M", stars: 2, pointDiff: -3, gamesPlayed: 2, lastTeammates: ["David"] },
        { name: "Charlie", gender: "M", stars: 4, pointDiff: 8, gamesPlayed: 2, lastTeammates: ["Alice"] }
      ];

      const updatedPlayers = addNewPlayer(existingPlayers, { name: "Diana", gender: "F" });

      assert.equal(updatedPlayers.length, 4);

      // Verify existing players' stats are completely preserved
      const alice = updatedPlayers.find(p => p.name === "Alice");
      assert.equal(alice.stars, 4);
      assert.equal(alice.pointDiff, 12);
      assert.equal(alice.gamesPlayed, 2);

      const bob = updatedPlayers.find(p => p.name === "Bob");
      assert.equal(bob.stars, 2);
      assert.equal(bob.pointDiff, -3);

      // Verify new player has initial stats
      const diana = updatedPlayers.find(p => p.name === "Diana");
      assert.ok(diana, "New player Diana must exist");
      assert.equal(diana.gender, "F");
      assert.equal(diana.stars, 0);
      assert.equal(diana.pointDiff, 0);
      assert.equal(diana.gamesPlayed, 0);

      // Verify standings order preserves ranking
      const standings = sortStandings(updatedPlayers);
      assert.deepEqual(standings.map(p => p.name), ["Alice", "Charlie", "Bob", "Diana"]);
    });

    it("should throw an error when trying to add an invalid or duplicate active player", () => {
      const players = [{ name: "Alice", gender: "F", stars: 2, pointDiff: 0, active: true }];

      assert.throws(() => addNewPlayer(players, { name: "", gender: "F" }), /erforderlich/);
      assert.throws(() => addNewPlayer(players, { name: "Alice", gender: "F" }), /existiert bereits/);
    });

    it("should reactivate an inactive player when re-added and preserve their score", () => {
      const players = [{ name: "Alice", gender: "F", stars: 4, pointDiff: 8, active: false }];

      const updated = addNewPlayer(players, { name: "Alice", gender: "F" });
      assert.equal(updated.length, 1);
      assert.equal(updated[0].active, true);
      assert.equal(updated[0].stars, 4);
      assert.equal(updated[0].pointDiff, 8);
    });

    it("should keep a removed player in the standings as inactive with all their stats preserved", () => {
      const existingPlayers = [
        { name: "Alice", gender: "F", stars: 6, pointDiff: 15, gamesPlayed: 3, lastTeammates: [], active: true },
        { name: "Bob", gender: "M", stars: 4, pointDiff: 5, gamesPlayed: 3, lastTeammates: [], active: true },
        { name: "Charlie", gender: "M", stars: 2, pointDiff: -8, gamesPlayed: 3, lastTeammates: [], active: true }
      ];

      // Remove Bob (marks Bob as active: false)
      const updatedPlayers = removePlayer(existingPlayers, "Bob");

      // All 3 players remain in the list
      assert.equal(updatedPlayers.length, 3);

      const bob = updatedPlayers.find(p => p.name === "Bob");
      assert.ok(bob, "Bob should still exist in the standings list");
      assert.equal(bob.active, false, "Bob should be marked as inactive");
      assert.equal(bob.stars, 4, "Bob's earned stars must be preserved");
      assert.equal(bob.pointDiff, 5, "Bob's point diff must be preserved");

      // Verify Alice and Charlie keep their stats intact
      const alice = updatedPlayers.find(p => p.name === "Alice");
      assert.equal(alice.stars, 6);
      assert.equal(alice.active, true);

      // Standings display still lists Bob in the correct ranking position
      const standings = sortStandings(updatedPlayers);
      assert.deepEqual(standings.map(p => p.name), ["Alice", "Bob", "Charlie"]);
    });

    it("should exclude inactive/removed players from team generation while continuing equal distribution", () => {
      let players = createMockPlayers(10, 8); // 18 active players
      // Add 2 women mid-tournament
      players = addNewPlayer(players, { name: "Extra Woman 1", gender: "F" });
      players = addNewPlayer(players, { name: "Extra Woman 2", gender: "F" });
      // Remove 1 man mid-tournament (Man 1 becomes inactive)
      players = removePlayer(players, "Man 1");

      // Total list is 20 players (19 active + 1 inactive)
      assert.equal(players.length, 20);
      assert.equal(players.filter(p => p.active !== false).length, 19);

      const teams = buildTeamsFromPlayers(players, 6);
      const assignedPlayers = teams.flatMap(t => t.players);

      // Verify inactive player is NOT on any team
      assert.ok(!assignedPlayers.some(p => p.name === "Man 1"), "Inactive player Man 1 must not be placed on any team");
      assert.equal(assignedPlayers.length, 19, "Only active players should be placed on teams");

      const menCounts = teams.map(t => t.players.filter(p => p.gender === "M").length);
      const womenCounts = teams.map(t => t.players.filter(p => p.gender === "F").length);
      const totalCounts = teams.map(t => t.players.length);

      assert.ok(Math.max(...menCounts) - Math.min(...menCounts) <= 1, "Men must still be equally distributed");
      assert.ok(Math.max(...womenCounts) - Math.min(...womenCounts) <= 1, "Women must still be equally distributed");
      assert.ok(Math.max(...totalCounts) - Math.min(...totalCounts) <= 1, "Total team sizes must be balanced");
    });
  });

  describe("Evaluation Mode (Backwards Spotlight with Red Lantern & Trophy, and Final Standings Table)", () => {
    it("should return spotlight players from backwards (last place first), awarding Red Lantern to last and Trophy to 1st", () => {
      const players = [
        { name: "Alice", gender: "F", stars: 6, pointDiff: 14 },
        { name: "Bob", gender: "M", stars: 4, pointDiff: 6 },
        { name: "Charlie", gender: "M", stars: 4, pointDiff: 2 },
        { name: "Diana", gender: "F", stars: 2, pointDiff: -5 },
        { name: "Eve", gender: "F", stars: 0, pointDiff: -17 }
      ];

      const presentationList = getPresentationStandings(players);

      assert.equal(presentationList.length, 5);

      // Verify backwards order for spotlight (last place first)
      const namesInOrder = presentationList.map(p => p.name);
      assert.deepEqual(namesInOrder, ["Eve", "Diana", "Charlie", "Bob", "Alice"]);

      // Verify last place item (Eve, rank 5) has Red Lantern flag
      const lastPlace = presentationList[0];
      assert.equal(lastPlace.name, "Eve");
      assert.equal(lastPlace.rank, 5);
      assert.equal(lastPlace.isLast, true, "Last place must have isLast flag (Red Lantern)");
      assert.equal(lastPlace.isFirst, false);
      assert.equal(lastPlace.stars, 0);
      assert.equal(lastPlace.pointDiff, -17);

      // Verify middle items do not have first/last flags
      assert.equal(presentationList[1].isFirst, false);
      assert.equal(presentationList[1].isLast, false);
      assert.equal(presentationList[2].isFirst, false);
      assert.equal(presentationList[2].isLast, false);

      // Verify 1st place item (Alice, rank 1, spotlighted last) has Trophy flag
      const firstPlace = presentationList[presentationList.length - 1];
      assert.equal(firstPlace.name, "Alice");
      assert.equal(firstPlace.rank, 1);
      assert.equal(firstPlace.isFirst, true, "1st place must have isFirst flag (Trophy)");
      assert.equal(firstPlace.isLast, false);
      assert.equal(firstPlace.stars, 6);
      assert.equal(firstPlace.pointDiff, 14);

      // Verify final standings tabular order has 1st place at the top
      const finalTableOrder = sortStandings(players);
      assert.deepEqual(finalTableOrder.map(p => p.name), ["Alice", "Bob", "Charlie", "Diana", "Eve"]);
    });

    it("should handle single player or empty player list gracefully in evaluation mode", () => {
      assert.deepEqual(getPresentationStandings([]), []);

      const single = [{ name: "Solo", gender: "M", stars: 2, pointDiff: 5 }];
      const presSingle = getPresentationStandings(single);
      assert.equal(presSingle.length, 1);
      assert.equal(presSingle[0].rank, 1);
      assert.equal(presSingle[0].isFirst, true);
      assert.equal(presSingle[0].isLast, true);
    });

    it("should assign shared places when players have exact same standing (stars & diff), including shared Trophy and Red Lantern", () => {
      const players = [
        { name: "Alice", gender: "F", stars: 6, pointDiff: 10 },
        { name: "Bob", gender: "M", stars: 6, pointDiff: 10 },   // Tied with Alice for 1st
        { name: "Charlie", gender: "M", stars: 4, pointDiff: 2 }, // 3rd place
        { name: "David", gender: "M", stars: 2, pointDiff: -8 },  // Tied with Eve for last
        { name: "Eve", gender: "F", stars: 2, pointDiff: -8 }     // Tied with David for last
      ];

      const ranked = getRankedStandings(players);

      // Verify ranks: Alice and Bob share #1, Charlie is #3, David and Eve share #4
      assert.equal(ranked[0].rank, 1);
      assert.equal(ranked[0].isTied, true);
      assert.equal(ranked[0].isFirst, true, "Alice has Trophy flag");

      assert.equal(ranked[1].rank, 1);
      assert.equal(ranked[1].isTied, true);
      assert.equal(ranked[1].isFirst, true, "Bob also has Trophy flag");

      assert.equal(ranked[2].rank, 3);
      assert.equal(ranked[2].isTied, false);
      assert.equal(ranked[2].isFirst, false);
      assert.equal(ranked[2].isLast, false);

      assert.equal(ranked[3].rank, 4);
      assert.equal(ranked[3].isTied, true);
      assert.equal(ranked[3].isLast, true, "David has Red Lantern flag");

      assert.equal(ranked[4].rank, 4);
      assert.equal(ranked[4].isTied, true);
      assert.equal(ranked[4].isLast, true, "Eve also has Red Lantern flag");

      // Verify Presentation backwards list reflects shared places
      const pres = getPresentationStandings(players);
      assert.equal(pres.length, 5);
      // First two in presentation are David and Eve (both rank 4, both Red Lantern)
      assert.equal(pres[0].rank, 4);
      assert.equal(pres[0].isLast, true);
      assert.equal(pres[1].rank, 4);
      assert.equal(pres[1].isLast, true);
      // Last two in presentation are Bob and Alice (both rank 1, both Trophy)
      assert.equal(pres[3].rank, 1);
      assert.equal(pres[3].isFirst, true);
      assert.equal(pres[4].rank, 1);
      assert.equal(pres[4].isFirst, true);
    });
  });

  describe("LocalStorage State Persistence & Recovery", () => {
    it("should safely handle saving and clearing state when localStorage is available", () => {
      let store = {};
      global.localStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; }
      };

      saveTournamentState();
      assert.ok(store["volleyball_tournament_state"], "State must be saved under key 'volleyball_tournament_state'");

      const parsed = JSON.parse(store["volleyball_tournament_state"]);
      assert.ok(typeof parsed === "object");
      assert.ok(Array.isArray(parsed.players));
      assert.equal(typeof parsed.roundNumber, "number");

      clearTournamentState();
      assert.equal(store["volleyball_tournament_state"], undefined, "State must be cleared on tournament reset");
    });
  });
});
