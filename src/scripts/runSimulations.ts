import path from 'path';
import fs from 'fs';
import { table } from 'table';
import type { ITeamData, IGame } from '../interfaces';
import { runSimulations } from './simulations';
import { getTeamAndScheduleData, currentWeek, currentYear } from './utils';

// ts-node src/scripts/runSimulations.ts

// simulate the season, write the results to the file system and log the results in a table

// Import file containing team and schedule data
const previousWeek = currentWeek - 1;
const includeChangeWeekOverWeek = false;

const { teams: originalTeams, schedule: originalSchedule } = getTeamAndScheduleData();

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

  const currentWeekSimulationResults = runSimulations(params);

  // TODO: handle case where file already exists and we can either augment it with more results or reference it instead
  // write simulation results to file system
  const outputFilePath = path.join(__dirname, `../data/simulationResults/${currentYear}-${currentWeek}.json`);
  fs.writeFileSync(outputFilePath, JSON.stringify(currentWeekSimulationResults, null, 2), 'utf8');

  let previousWeekSimulationResults;
  if (includeChangeWeekOverWeek) {
    // note assumes same simulation count as current week (for now)
    const previousWeekFilePath = path.join(__dirname, `../data/simulationResults/${currentYear}-${previousWeek}.json`);
    previousWeekSimulationResults = JSON.parse(fs.readFileSync(previousWeekFilePath, 'utf8'));
  }

  const simulationCount = currentWeekSimulationResults[Object.keys(currentWeekSimulationResults)[0]].numSeasons;

  const resultsList = [[
    'Rank',
    'Name',
    '% Playoffs',
    ...(includeChangeWeekOverWeek ? ['Change'] : []),
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
    currentWeekSimulationResults[a.name].playoffAppearances > currentWeekSimulationResults[b.name].playoffAppearances
  ) ? -1 : 1));

  const getStringPercentage = (value: number) => ((value / simulationCount) * 100).toFixed(2);

  sortedTeamList.forEach((entity, index) => {
    const teamStats = currentWeekSimulationResults[entity.name];

    let playoffDelta;
    if (includeChangeWeekOverWeek) {
      const previousWeekStats = previousWeekSimulationResults[entity.name];
      playoffDelta = teamStats.playoffAppearances - previousWeekStats.playoffAppearances;
    }

    resultsList.push([
      `${index + 1}`,
      entity.name,
      getStringPercentage(teamStats.playoffAppearances),
      ...(includeChangeWeekOverWeek ? [getStringPercentage(playoffDelta)] : []),
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
  shouldSimulatePlayoffs: true,
});
