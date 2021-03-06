import request from 'superagent';
import fs from 'fs';
import path from 'path';
import { idToName, leagueId } from '../leagueData';

// ts-node src/scripts/generateTeamSchedule.ts

/**
 * Calls fleaflicker api to
 * generate team map - Record<string, ITeamData>
 * generate schedule array IGame[]
 * output them to a file in data/teamSchedules
 */

// TODO: extract fleaflicker API code to a helper file

const maxWeeks = 14;

// Usually from footballguys' league dominator tool
// Last updated: 11/30/21 12:45 pm
// for final week, used fleaflicker's optimum projection for each team
const teamFuturePPG: Record<string, number> = {
  Carter: 154.51,
  Kevin: 148.33,
  Brandon: 147.56,
  Holden: 143.94,
  Chris: 121.55,
  Jake: 110.96,
  Mike: 109.56,
  Zach: 107.87,
  Paul: 97.82,
  Jeremy: 93.37,
};

const computeTeams = async () => {
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
    });
  });

  // get the current week and use that to identify current week in league year
  const currentWeekScoreboard: any = await request
    .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
    .query({ leagueId })
    .send();

  const currentWeek = currentWeekScoreboard.body.schedulePeriod.value;
  const isCurrentWeekComplete = currentWeekScoreboard.body.games[0].isFinalScore;
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

const computeSchedules = async () => {
  const schedule: { home: string; away: string; week: number; }[] = [];

  // always get current week's scoreboard
  const currentWeekScoreboard: any = await request
    .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
    .query({ leagueId })
    .send();

  const currentWeek = currentWeekScoreboard.body.schedulePeriod.value;
  const isCurrentWeekComplete = currentWeekScoreboard.body.games[0].isFinalScore;

  // numbers from currentWeek + 1 to end of season
  const schedulingPeriodsToQuery = [...Array(maxWeeks + 1).keys()].slice(currentWeek + 1);

  const requestPromises = schedulingPeriodsToQuery.map((scoringPeriod) => request
    .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
    .query({ leagueId, scoring_period: scoringPeriod })
    .send());

  const results = await Promise.all(requestPromises);

  // we need to include the current week's games if it's not complete
  [...(isCurrentWeekComplete ? [] : [currentWeekScoreboard]), ...results].forEach((scoreboard) => {
    scoreboard.body.games.forEach((game) => {
      schedule.push({
        home: idToName[game.home.id],
        away: idToName[game.away.id],
        week: scoreboard.body.schedulePeriod.value,
      });
    });
  });

  // console.log(JSON.stringify(schedule, null, 4));
  return schedule;
};

const computeAndWriteToFile = async () => {
  const fileData = {
    teams: await computeTeams(),
    schedule: await computeSchedules(),
  };
  const currentWeek = fileData.schedule[0].week;
  const filePath = path.join(__dirname, `../data/teamSchedules/2021-${currentWeek}.json`);
  fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
};

computeAndWriteToFile();
