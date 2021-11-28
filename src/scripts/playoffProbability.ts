import { table } from 'table';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { IGame, ITeamData } from '../interfaces';
import { calculateSingleGameProbability } from './utils';
import { generateProbabilityMap, runSimulations } from './simulations';

// An independent script that calculates teams odds of making the playoffs
// ts-node src/scripts/playoffProbability.ts

// TODO: split this script into separate scripts
// TODO: put logs behind a verbose/silent mode flag

/**
 * Flaws in this analysis
 * - Relies on projected future PPG from FBG's projection system
 * - Assumes season-end total ppg = current total + games remaining * future ppg
 *   but that doesn't take into account wins/losses. i.e. if I win some game as an underdog, I probably overperformed my ppg
 * - individual game win probability model might be overfit, hard to say
 * - assumes future ppg is the same every week
 */

/**
 * Future improvements
 * - Determine highest leverage games for a given team owner
 *    - for each game on my schedule, calculate win probability removing it from simulation and setting result and compare
 *
 * - Add ability to highlight a specific result - like when does Jeremy ever make the playoffs
 *    - could persist simulation results in a db and make them queryable
 */

// Import file containing team and schedule data
const currentWeek = 12;
const dataFilePath = path.join(__dirname, `../data/teamSchedules/2021-${currentWeek}.json`);
const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

const {
  teams: originalTeams,
  schedule: originalSchedule,
}: { teams: Record<string, ITeamData>; schedule: IGame[]; } = teamAndScheduleData;

const weeklyGameLeverages = (params: {
    week: number;
    baseProbabilityMap: Record<string, number>;
    schedule: IGame[];
    teams: Record<string, ITeamData>;
}) => {
  const {
    week, baseProbabilityMap, schedule, teams,
  } = params;

  const gamesToAnalyze = schedule.filter((game) => game.week === week);

  const resultsList = [[
    'Name',
    'Base Probability',
  ], [
    '',
    '',
  ]];

  Object.keys(baseProbabilityMap).forEach((name) => {
    resultsList.push([
      name,
      baseProbabilityMap[name].toFixed(2),
    ]);
  });

  gamesToAnalyze.forEach((game) => {
    // new schedule without the game in question
    const newSchedule = _.cloneDeep(schedule)
      .filter((filterGame) => !(filterGame.home === game.home
        && filterGame.away === game.away
        && filterGame.week === game.week));
    // console.log(newSchedule);

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
      const simulationResults = runSimulations({ schedule: newSchedule, teams: teamsCopy });
      const newProbabilityMap = generateProbabilityMap(simulationResults);

      newProbabilityMaps.push(newProbabilityMap);
    });

    resultsList[0].push(`${game.home} win`, `${game.away} win`);

    const homeWinProbability = calculateSingleGameProbability(
      teams[game.home].projectedFuturePPG,
      teams[game.away].projectedFuturePPG,
    );
    resultsList[1].push(`${(homeWinProbability * 100).toFixed(2)}%`, `${((1 - homeWinProbability) * 100).toFixed(2)}%`);

    Object.keys(baseProbabilityMap).forEach((name, index) => {
      resultsList[index + 2].push(
        `${(newProbabilityMaps[0][name] - baseProbabilityMap[name]).toFixed(2)}%`,
        `${(newProbabilityMaps[1][name] - baseProbabilityMap[name]).toFixed(2)}%`,
      );
    });
    console.log(`Done with simulation of ${game.home} vs. ${game.away} in week ${week}`);
  });

  // console.log(JSON.stringify(resultsList, null, 2));
  console.log(table(resultsList));
};

const runWeeklyGameLeverages = (params: {
    schedule: IGame[],
    teams: Record<string, ITeamData>
}) => {
  const { schedule, teams } = params;
  console.log('beginning baseline simulation');
  const simulationResults = runSimulations({ schedule, teams });
  const baseProbabilityMap = generateProbabilityMap(simulationResults);
  console.log('Done with baseline simulation', baseProbabilityMap);
  weeklyGameLeverages({
    week: currentWeek, baseProbabilityMap, schedule, teams,
  });
};

const determineEveryPossibleOutcome = (params: {
    schedule: IGame[];
    teams: Record<string, ITeamData>;
}) => {
  const { schedule, teams } = params;
  const scheduleCopy = _.cloneDeep(schedule);
  const teamsCopy = _.cloneDeep(teams);
  // For just my games
  const name = 'Holden';
  // determine who makes the playoffs in every individual scenario + the odds of that scenario

  // all potential outcomes for my games
  let outcomes: string[][] = [];
  const myGames = schedule.filter((filterGame) => filterGame.home === name || filterGame.away === name);
  myGames.forEach(() => {
    const results = ['win', 'lose'];
    if (outcomes.length === 0) {
      outcomes.push([results[0]], [results[1]]);
    } else {
      outcomes = _.flatMap(outcomes, (outcome) => [outcome.concat(results[0]), outcome.concat(results[1])]);
    }
  });
  // probability of home team winning each game
  const myGamesHomeWinProbability: number[] = myGames.map((game) => calculateSingleGameProbability(
    teamsCopy[game.home].projectedFuturePPG,
    teamsCopy[game.away].projectedFuturePPG,
  ));

  let resultsList = [[
    'Outcome',
    'Wins',
    'Losses',
    'Probability',
    'Playoff Probability',
  ]];

  const data: any[] = [];

  // for each set of outcomes, simulate the season
  outcomes.forEach((outcomeSet, index) => {
    const oddsOfScenario = outcomeSet.reduce((acc: number, outcome: string, gameIndex: number) => {
      const currentGame = myGames[gameIndex];
      const homeTeamWinProb = myGamesHomeWinProbability[gameIndex];
      if (currentGame.home === name) {
        return acc * (outcome === 'win' ? homeTeamWinProb : (1 - homeTeamWinProb));
      }
      // current person is the away team
      return acc * (outcome === 'win' ? (1 - homeTeamWinProb) : homeTeamWinProb);
    }, 1);
    console.log(outcomeSet, oddsOfScenario.toFixed(2));

    // simulate playoffs in each scenario and determine odds then

    // updated schedule and teams for this scenario
    const newSchedule = _.cloneDeep(scheduleCopy).filter((game) => game.home !== name && game.away !== name);
    const newTeams = _.cloneDeep(teamsCopy);
    myGames.forEach((game, gameIndex) => {
      // set the winners and losers of all of my games
      const outcome = outcomeSet[gameIndex];
      let opponentName;
      if (game.home === name) {
        opponentName = game.away;
      } else {
        opponentName = game.home;
      }
      if (outcome === 'win') {
        newTeams[name].wins++;
        newTeams[name].records[opponentName]++;
        newTeams[opponentName].losses++;
      } else {
        newTeams[opponentName].wins++;
        newTeams[opponentName].records[name]++;
        newTeams[name].losses++;
      }
    });

    const simulationResults = runSimulations({ schedule: newSchedule, teams: newTeams });
    const probabilityMap = generateProbabilityMap(simulationResults);
    console.log(`Completed outcome set ${index + 1} of ${outcomes.length}`);

    data.push([
      outcomeSet.join(', '),
      outcomeSet.filter((a) => a === 'win').length,
      outcomeSet.filter((a) => a === 'lose').length,
      `${(oddsOfScenario * 100).toFixed(2)}%`,
      `${probabilityMap[name].toFixed(2)}%`,
    ]);
  });

  resultsList = resultsList.concat(data.sort((a, b) => (Number(a[1]) > Number(b[1]) ? -1 : 1)));

  console.log(table(resultsList));
};

runWeeklyGameLeverages({ schedule: originalSchedule, teams: originalTeams });
determineEveryPossibleOutcome({ schedule: originalSchedule, teams: originalTeams });
