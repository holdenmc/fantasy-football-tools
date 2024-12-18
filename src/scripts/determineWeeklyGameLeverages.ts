import { table } from 'table';
import * as _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { IGame, ITeamData } from '../interfaces';
import {
  calculateSingleGameProbability, getTeamAndScheduleData,
} from './utils';
import { generateProbabilityMap, runSimulations } from './simulations';
import { LeagueId, hasDivisionTiebreaker } from '../leagueData';

// ts-node src/scripts/determineWeeklyGameLeverages.ts

// Determine how each manager's playoff odds change based on the outcomes of each game this week

// TODO: put logs behind a verbose/silent mode flag

const leagueIds: LeagueId[] = [183250, 345994];

// Import file containing team and schedule data
const currentYear = 2024;
const currentWeek = 15;
const currentVersion = 0;

const numSimulations = 100 * 1000; // 100k
const includeWeekInHeader = false;

const weeklyGameLeverages = (params: {
    week: number;
    baseProbabilityMap: Record<string, number>;
    schedule: IGame[];
    teams: Record<string, ITeamData>;
    includeGameProbability?: boolean; // include a second header row with probability of each game
    userFilter?: string[]; // names to include in output
    scheduleFilter?: string[]; // include all the games remaining for this set of users
    leagueId: LeagueId;
}) => {
  const {
    week, baseProbabilityMap, schedule, teams, includeGameProbability = false, userFilter, scheduleFilter, leagueId,
  } = params;

  const includeInOutput = (name) => !userFilter || userFilter.includes(name);

  const gamesToAnalyze = scheduleFilter
    ? schedule.filter((game) => scheduleFilter.includes(game.home) || scheduleFilter.includes(game.away))
    : schedule.filter((game) => game.week === week);

  const resultsList = [[
    'Name',
    'Baseline',
  ]];

  if (includeGameProbability) {
    resultsList.push(['', '']);
  }

  Object.keys(baseProbabilityMap).forEach((name) => {
    if (includeInOutput(name)) {
      resultsList.push([
        name,
        baseProbabilityMap[name].toFixed(2),
      ]);
    }
  });

  let gameOfTheWeekScore = 0;
  let gameOfTheWeek;
  gamesToAnalyze.forEach((game) => {
    // new schedule without the game in question
    const newSchedule = _.cloneDeep(schedule)
      .filter((filterGame) => !(filterGame.home === game.home
        && filterGame.away === game.away
        && filterGame.week === game.week));

    const newProbabilityMaps: Record<string, number>[] = [];

    ['home', 'away'].forEach((winner) => {
      const teamsCopy = _.cloneDeep(teams);
      if (winner === 'home') {
        teamsCopy[game.home].wins++;
        teamsCopy[game.away].losses++;
        teamsCopy[game.home].records[game.away]++;
      } else {
        teamsCopy[game.away].wins++;
        teamsCopy[game.home].losses++;
        teamsCopy[game.away].records[game.home]++;
      }

      // console.log(JSON.stringify(teamsCopy, null, 2));

      // console.log(`Running simulation where ${winner === 'home' ? game.home : game.away} wins ${game.home} vs. ${game.away} in week ${week}`);
      const simulationResults = runSimulations({
        schedule: newSchedule, teams: teamsCopy, numSimulations, useDivisionTiebreaker: hasDivisionTiebreaker(leagueId),
      });
      const newProbabilityMap = generateProbabilityMap(simulationResults);

      newProbabilityMaps.push(newProbabilityMap);
    });

    resultsList[0].push(`${game.home}${includeWeekInHeader ? ` W (${game.week})` : ''}`, `${game.away}${includeWeekInHeader ? ` W (${game.week})` : ''}`);

    if (includeGameProbability) {
      const homeWinProbability = calculateSingleGameProbability(
        teams[game.home].projectedFuturePPG,
        teams[game.away].projectedFuturePPG,
      );
      resultsList[1].push(
        `${(homeWinProbability * 100).toFixed(2)}%`,
        `${((1 - homeWinProbability) * 100).toFixed(2)}%`,
      );
    }

    let totalWinProbabilityChange = 0;
    let index = 0;
    Object.keys(baseProbabilityMap).forEach((name) => {
      if (includeInOutput(name)) {
        const resultsIndex = includeGameProbability ? index + 2 : index + 1;
        resultsList[resultsIndex].push(
          `${(newProbabilityMaps[0][name] - baseProbabilityMap[name]).toFixed(2)}%`,
          `${(newProbabilityMaps[1][name] - baseProbabilityMap[name]).toFixed(2)}%`,
        );
        index++;
      }

      totalWinProbabilityChange += Math.abs(newProbabilityMaps[0][name] - baseProbabilityMap[name]);
      totalWinProbabilityChange += Math.abs(newProbabilityMaps[1][name] - baseProbabilityMap[name]);
    });
    console.log(`Done with simulation of ${game.home} vs. ${game.away} in week ${week}`);
    console.log(`Total amplitude: ${totalWinProbabilityChange}`);
    if (totalWinProbabilityChange > gameOfTheWeekScore) {
      gameOfTheWeekScore = totalWinProbabilityChange;
      gameOfTheWeek = game;
    }
  });

  // console.log(JSON.stringify(resultsList, null, 2));
  console.log(table(resultsList));
  console.log(`Game of the Week: ${gameOfTheWeek.home} vs. ${gameOfTheWeek.away}: ${gameOfTheWeekScore}`);
};

const runWeeklyGameLeverages = (params: {
    schedule: IGame[];
    teams: Record<string, ITeamData>;
    leagueId: LeagueId;
}) => {
  const { schedule, teams, leagueId } = params;
  console.log('beginning baseline simulation');

  const simulationResultsPath = path.join(__dirname, `../data/simulationResults/${leagueId}/${currentYear}/${currentYear}-${currentWeek}-${currentVersion}.json`);
  const simulationResults = JSON.parse(fs.readFileSync(simulationResultsPath, 'utf8'));
  const baseProbabilityMap = generateProbabilityMap(simulationResults);
  console.log('Done with baseline simulation', baseProbabilityMap);
  weeklyGameLeverages({
    week: currentWeek,
    baseProbabilityMap,
    schedule,
    teams,
    leagueId,
    // userFilter: ['Holden', 'Kevin', 'Jake'],
    // scheduleFilter: ['Holden', 'Kevin', 'Jake'],
  });
};

leagueIds.forEach((leagueId) => {
  const { teams: originalTeams, schedule: originalSchedule } = getTeamAndScheduleData({
    version: currentVersion, week: currentWeek, year: currentYear, leagueId,
  });

  runWeeklyGameLeverages({ schedule: originalSchedule, teams: originalTeams, leagueId });
});
