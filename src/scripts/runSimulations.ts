import path from 'path';
import fs from 'fs';
import { table } from 'table';
import type { ITeamData, IGame } from '../interfaces';
import { runSimulations } from './simulations';

// ts-node src/scripts/runSimulations.ts

// simulate the season and log the results in a table

// Import file containing team and schedule data
const currentYear = 2022;
const currentWeek = 10;
const dataFilePath = path.join(__dirname, `../data/teamSchedules/${currentYear}-${currentWeek}.json`);
const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

const {
  teams: originalTeams,
  schedule: originalSchedule,
}: { teams: Record<string, ITeamData>; schedule: IGame[]; } = teamAndScheduleData;

// Simulate the season multiple times
const simulateAndLogResults = (params: {
    schedule: IGame[];
    teams: Record<string, ITeamData>;
    shouldSimulatePlayoffs?: boolean;
    numSimulations?: number;
}) => {
  const {
    teams,
    shouldSimulatePlayoffs = false,
  } = params;

  const simulationResults = runSimulations(params);
  const simulationCount = simulationResults[Object.keys(simulationResults)[0]].numSeasons;

  const resultsList = [[
    'Rank',
    'Name',
    '% Playoffs',
    '% 1st',
    '% 2nd',
    '% 3rd',
    '% 4th',
    ...(shouldSimulatePlayoffs ? [
      '% Appear in Final',
      '% Runner Up',
      '% Champion',
    ] : []),
  ]];

  const sortedTeamList = Object.values(teams).sort((a, b) => ((
    simulationResults[a.name].playoffAppearances > simulationResults[b.name].playoffAppearances
  ) ? -1 : 1));

  const getStringPercentage = (value: number) => ((value / simulationCount) * 100).toFixed(2);

  sortedTeamList.forEach((entity, index) => {
    const teamStats = simulationResults[entity.name];
    resultsList.push([
      `${index + 1}`,
      entity.name,
      getStringPercentage(teamStats.playoffAppearances),
      getStringPercentage(teamStats.rankings['1']),
      getStringPercentage(teamStats.rankings['2']),
      getStringPercentage(teamStats.rankings['3']),
      getStringPercentage(teamStats.rankings['4']),
      ...(shouldSimulatePlayoffs ? [
        getStringPercentage((teamStats.championships + teamStats.runnerUps)),
        getStringPercentage(teamStats.runnerUps),
        getStringPercentage(teamStats.championships),
      ] : []),
    ]);
  });

  console.log(table(resultsList));
};

simulateAndLogResults({
  schedule: originalSchedule,
  teams: originalTeams,
  shouldSimulatePlayoffs: false,
});
