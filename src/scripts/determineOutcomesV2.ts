import { table } from 'table';
import * as _ from 'lodash';
import { IGame, ITeamData } from '../interfaces';
import { generateProbabilityMap, runSimulations } from './simulations';
import { calculateSingleGameProbability, getTeamAndScheduleData } from './utils';

// ts-node src/scripts/determineOutcomesV2.ts

// for a set remaining games, determine who makes the playoff in every scenario

// Import file containing team and schedule data
const { teams: originalTeams, schedule: originalSchedule } = getTeamAndScheduleData();

const determineEveryPossibleOutcome = (params: {
  schedule: IGame[];
  teams: Record<string, ITeamData>;
}) => {
  const { schedule, teams } = params;
  const scheduleCopy = _.cloneDeep(schedule);
  const teamsCopy = _.cloneDeep(teams);

  // all potential sets of outcomes for person's games
  let outcomes: string[][] = [];
  const remainingGames = schedule.filter((game) => game.home !== 'Paul' && game.home !== 'Brandon');
  remainingGames.forEach(() => {
    const results = ['win', 'lose'];
    if (outcomes.length === 0) {
      outcomes.push([results[0]], [results[1]]);
    } else {
      outcomes = _.flatMap(outcomes, (outcome) => [outcome.concat(results[0]), outcome.concat(results[1])]);
    }
  });
  // probability of home team winning each game
  const remainingGamesHomeWinProbability: number[] = remainingGames.map((game) => calculateSingleGameProbability(
    teamsCopy[game.home].projectedFuturePPG,
    teamsCopy[game.away].projectedFuturePPG,
  ));

  let resultsList = [[
    'Winners',
    'Probability',
    '1st',
    '2nd',
    '3rd',
    '4th',
  ]];

  const data: any[] = [];

  // for each set of outcomes, simulate the season
  outcomes.forEach((outcomeSet, index) => {
    const oddsOfScenario = outcomeSet.reduce((acc: number, outcome: string, gameIndex: number) => {
      const homeTeamWinProb = remainingGamesHomeWinProbability[gameIndex];
      return acc * (outcome === 'win' ? homeTeamWinProb : (1 - homeTeamWinProb));
    }, 1);
    console.log(outcomeSet, oddsOfScenario.toFixed(2));

    // updated schedule and teams for this scenario
    const newSchedule = _.cloneDeep(scheduleCopy).filter(
      (game) => !remainingGames.find((remainingGame) => remainingGame.home === game.home
        && remainingGame.away === game.away
        && remainingGame.week === game.week),
    );
    const newTeams = _.cloneDeep(teamsCopy);
    remainingGames.forEach((game, gameIndex) => {
      // set the winners and losers of each game, based on predetermined outcomes
      const outcome = outcomeSet[gameIndex];
      if (outcome === 'win') {
        newTeams[game.home].wins++;
        newTeams[game.home].records[game.away]++;
        newTeams[game.away].losses++;
      } else {
        newTeams[game.away].wins++;
        newTeams[game.away].records[game.home]++;
        newTeams[game.home].losses++;
      }
    });

    const simulationResults = runSimulations({ schedule: newSchedule, teams: newTeams, numSimulations: 1 });
    const probabilityMap = generateProbabilityMap(simulationResults);
    const names = Object.keys(probabilityMap);
    console.log(`Completed outcome set ${index + 1} of ${outcomes.length}`);
    // console.log(probabilityMap[names[3]]);

    data.push([
      outcomeSet.map(
        (outcome, mapIndex) => (outcome === 'win' ? remainingGames[mapIndex].home : remainingGames[mapIndex].away),
      ).join(', '),
      `${(oddsOfScenario * 100).toFixed(2)}%`,
      names[0],
      names[1],
      names[2],
      names[3],
    ]);
  });

  resultsList = resultsList.concat(data.sort((a, b) => (Number(a[1]) > Number(b[1]) ? -1 : 1)));

  console.log(table(resultsList));
};

determineEveryPossibleOutcome({ schedule: originalSchedule, teams: originalTeams });
