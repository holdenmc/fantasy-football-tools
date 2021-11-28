import path from 'path';
import fs from 'fs';
import { table } from 'table';
import _ from 'lodash';
import { IGame, ITeamData } from '../interfaces';
import { generateProbabilityMap, runSimulations } from './simulations';
import { calculateSingleGameProbability } from './utils';

// ts-node src/scripts/determinePossibleOutcomes.ts

// for a given manager, determine their playoff probability
// for each possible set of outcomes for their remaining schedule

// Import file containing team and schedule data
const currentWeek = 12;
const dataFilePath = path.join(__dirname, `../data/teamSchedules/2021-${currentWeek}.json`);
const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

const {
  teams: originalTeams,
  schedule: originalSchedule,
}: { teams: Record<string, ITeamData>; schedule: IGame[]; } = teamAndScheduleData;

const determineEveryPossibleOutcome = (params: {
  schedule: IGame[];
  teams: Record<string, ITeamData>;
}) => {
  const { schedule, teams } = params;
  const scheduleCopy = _.cloneDeep(schedule);
  const teamsCopy = _.cloneDeep(teams);
  // For just this person's games
  const name = 'Holden';

  // all potential sets of outcomes for person's games
  let outcomes: string[][] = [];
  const remainingGames = schedule.filter((filterGame) => filterGame.home === name || filterGame.away === name);
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
      const currentGame = remainingGames[gameIndex];
      const homeTeamWinProb = remainingGamesHomeWinProbability[gameIndex];
      if (currentGame.home === name) {
        return acc * (outcome === 'win' ? homeTeamWinProb : (1 - homeTeamWinProb));
      }
      // current person is the away team
      return acc * (outcome === 'win' ? (1 - homeTeamWinProb) : homeTeamWinProb);
    }, 1);
    console.log(outcomeSet, oddsOfScenario.toFixed(2));

    // updated schedule and teams for this scenario
    const newSchedule = _.cloneDeep(scheduleCopy).filter((game) => game.home !== name && game.away !== name);
    const newTeams = _.cloneDeep(teamsCopy);
    remainingGames.forEach((game, gameIndex) => {
      // set the winners and losers of each game, based on predetermined outcomes
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

determineEveryPossibleOutcome({ schedule: originalSchedule, teams: originalTeams });
