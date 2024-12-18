import path from 'path';
import fs from 'fs';
import { table } from 'table';
import type { ITeamData, IGame } from '../interfaces';
import { runSimulations } from './simulations';
import { getTeamAndScheduleData } from './utils';
import { hasDivisionTiebreaker, LeagueId } from '../leagueData';

// ts-node src/scripts/runSimulations.ts

// simulate the season, write the results to the file system and log the results in a table

// 183250 or 345994
const leagueIds: LeagueId[] = [183250, 345994];

// Import file containing team and schedule data
const currentYear = 2024;
const previousWeek = 14; // previous week and version to compare against
const previousVersion = 0;
const currentWeek = 15; // current week and version to simulate
const currentVersion = 0;
const includeChangeWeekOverWeek = true;

// Simulate the season multiple times
const simulateAndLogResults = (params: {
    schedule: IGame[];
    teams: Record<string, ITeamData>;
    shouldSimulatePlayoffs?: boolean;
    leagueId: LeagueId;
}) => {
  const {
    teams,
    schedule,
    shouldSimulatePlayoffs = false,
    leagueId,
  } = params;

  const currentWeekFilePath = path.join(__dirname, `../data/simulationResults/${leagueId}/${currentYear}/${currentYear}-${currentWeek}-${currentVersion}.json`);
  let existingCurrentWeekFile;
  try {
    existingCurrentWeekFile = fs.readFileSync(currentWeekFilePath, 'utf8');
  } catch (err) {
    console.log('Error when reading current week file, continuing as if it does not exist', err);
  }

  let currentWeekSimulationResults;
  if (existingCurrentWeekFile) {
    currentWeekSimulationResults = JSON.parse(existingCurrentWeekFile);
  } else {
    // if no previous results, run simulations and write results to file system
    currentWeekSimulationResults = runSimulations({
      schedule, teams, shouldSimulatePlayoffs, useDivisionTiebreaker: hasDivisionTiebreaker(leagueId),
    });
    fs.writeFileSync(currentWeekFilePath, JSON.stringify(currentWeekSimulationResults, null, 2), 'utf8');
  }

  let previousWeekSimulationResults;
  if (includeChangeWeekOverWeek) {
    // note assumes same simulation count as current week (for now)
    const previousWeekFilePath = path.join(__dirname, `../data/simulationResults/${leagueId}/${currentYear}/${currentYear}-${previousWeek}-${previousVersion}.json`);
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

    let playoffDelta: string = '';
    if (includeChangeWeekOverWeek) {
      const previousWeekStats = previousWeekSimulationResults[entity.name];
      playoffDelta = (
        ((teamStats.playoffAppearances / teamStats.numSeasons) * 100)
        - ((previousWeekStats.playoffAppearances / previousWeekStats.numSeasons) * 100)
      ).toFixed(2);
    }

    resultsList.push([
      `${index + 1}`,
      entity.name,
      getStringPercentage(teamStats.playoffAppearances),
      ...(includeChangeWeekOverWeek ? [playoffDelta] : []),
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

leagueIds.forEach((leagueId) => {
  const { teams: originalTeams, schedule: originalSchedule } = getTeamAndScheduleData({
    version: currentVersion, week: currentWeek, year: currentYear, leagueId,
  });

  simulateAndLogResults({
    schedule: originalSchedule,
    teams: originalTeams,
    shouldSimulatePlayoffs: true,
    leagueId,
  });
});
