import request from 'superagent';
import fs from 'fs';
import path from 'path';
import { LeagueId, leagues } from '../leagueData';

// ts-node src/scripts/generateTeamSchedule.ts

/**
 * Calls fleaflicker api to
 * generate team map - Record<string, ITeamData>
 * generate schedule array IGame[]
 * output them to a file in data/teamSchedules
 */

// TODO: extract fleaflicker API code to a helper file

const leagueIds: LeagueId[] = [183250, 345994];
const maxWeeks = 15;
const currentYear = 2024;
const version = 0;

const computeTeams = async (leagueId: LeagueId) => {
  const { teamFuturePPG, idToName } = leagues[leagueId];
  const teams = Object.values(idToName).reduce((acc, curr) => {
    acc[curr] = {
      name: curr,
      records: {},
    };
    Object.values(idToName).filter((name) => name !== curr).forEach((name) => {
      acc[curr].records[name] = 0;
    });
    return acc;
  }, {});

  const leagueStandings: any = await request
    .get('https://www.fleaflicker.com/api/FetchLeagueStandings')
    .query({ leagueId })
    .send();

  const { divisions } = leagueStandings.body;
  divisions.forEach((division) => {
    const divisionName = division.name;
    division.teams.forEach((team) => {
      const teamId = team.id;
      const nameKey = idToName[teamId];

      teams[nameKey].wins = team.recordOverall.wins ?? 0;
      teams[nameKey].losses = team.recordOverall.losses ?? 0;
      teams[nameKey].division = divisionName;
      teams[nameKey].totalPoints = team.pointsFor.value;
      teams[nameKey].totalOpponentPoints = 0;
    });
  });

  // get the current week and use that to identify current week in league year
  const currentWeekScoreboard: any = await request
    .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
    .query({ leagueId })
    .send();

  const currentWeek = currentWeekScoreboard.body.schedulePeriod.value;
  const isCurrentWeekComplete = currentWeekScoreboard.body.games?.length > 0 && currentWeekScoreboard.body.games[0].isFinalScore;
  // 1 to (current week - 1) in array form (i.e. [1, 2] when current week is 3)
  const schedulingPeriodsToQuery = [...Array(currentWeek).keys()].slice(1);

  const requestPromises = schedulingPeriodsToQuery.map((scoringPeriod) => request
    .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
    .query({ leagueId, scoring_period: scoringPeriod })
    .send());

  const results: any[] = await Promise.all(requestPromises);

  // If the current week is complete, include it in the records calculations
  [...(isCurrentWeekComplete ? [currentWeekScoreboard] : []), ...results].forEach((scoreboard) => {
    scoreboard.body.games.forEach((game) => {
      const isHomeWinner = game.homeResult === 'WIN';
      const homeTeamName = idToName[game.home.id];
      const awayTeamName = idToName[game.away.id];

      if (isHomeWinner) {
        teams[homeTeamName].records[awayTeamName]++;
      } else {
        teams[awayTeamName].records[homeTeamName]++;
      }
    });
  });

  // compute total points for tiebreakers by adding projections
  Object.keys(teams).forEach((ownerName) => {
    teams[ownerName].projectedFuturePPG = teamFuturePPG[ownerName];
    const remainingWeeks = maxWeeks - (isCurrentWeekComplete ? currentWeek : currentWeek - 1);
    teams[ownerName].totalPoints += remainingWeeks * teams[ownerName].projectedFuturePPG;
    // console.log(ownerName, teams[ownerName].totalPoints);
  });

  // console.log(JSON.stringify(teams, null, 4));
  return teams;
};

const computeSchedules = async (leagueId: LeagueId) => {
  const { teamFuturePPG, idToName } = leagues[leagueId];
  const schedule: { home: string; away: string; week: number; }[] = [];

  // always get current week's scoreboard
  const currentWeekScoreboard: any = await request
    .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
    .query({ leagueId })
    .send();

  const currentWeek = currentWeekScoreboard.body.schedulePeriod.value;
  const isCurrentWeekComplete = currentWeekScoreboard.body.games?.length > 0 && currentWeekScoreboard.body.games[0].isFinalScore;

  // numbers from currentWeek + 1 to end of season
  const schedulingPeriodsToQuery = [...Array(maxWeeks + 1).keys()].slice(currentWeek + 1);

  const requestPromises = schedulingPeriodsToQuery.map((scoringPeriod) => request
    .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
    .query({ leagueId, scoring_period: scoringPeriod })
    .send());

  const results = await Promise.all(requestPromises);

  // we need to include the current week's games if it's not complete
  [...(isCurrentWeekComplete ? [] : [currentWeekScoreboard]), ...results].forEach((scoreboard) => {
    scoreboard.body.games?.forEach((game) => {
      // Skip week 8, it'll get added to the schedule automatically later as a game vs. median
      if (currentWeek <= 8 && scoreboard.body.schedulePeriod.value === 8) return;

      schedule.push({
        home: idToName[game.home.id],
        away: idToName[game.away.id],
        week: scoreboard.body.schedulePeriod.value,
      });
    });
  });

  // 1x game against the median in week 8, simulated as top half vs. bottom counterpart (i.e. 1 vs. 10, 2 vs. 9, etc...)
  if (currentWeek <= 8) {
    const leagueSize = Object.keys(teamFuturePPG).length;
    const topHalf = Object.keys(teamFuturePPG).slice(0, leagueSize / 2);
    const bottomHalf = Object.keys(teamFuturePPG).slice(leagueSize / 2, leagueSize);
    topHalf.forEach((name, index) => {
      const scheduleItem = { home: name, away: bottomHalf[bottomHalf.length - 1 - index], week: 8 };
      const scheduleUpdateMethod = currentWeek === 8 ? 'unshift' : 'push';
      schedule[scheduleUpdateMethod](scheduleItem);
    });
  }

  // console.log(JSON.stringify(schedule, null, 4));
  return schedule;
};

const computeAndWriteToFile = async (leagueId: LeagueId) => {
  const fileData = {
    teams: await computeTeams(leagueId),
    schedule: await computeSchedules(leagueId),
  };
  const currentWeek = fileData.schedule[0].week;
  const filePath = path.join(__dirname, `../data/teamSchedules/${leagueId}/${currentYear}/${currentYear}-${currentWeek}-${version}.json`);
  fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
};

leagueIds.forEach((leagueId) => {
  computeAndWriteToFile(leagueId);
});
