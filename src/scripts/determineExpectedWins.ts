import { table } from 'table';
import * as _ from 'lodash';
import { ITeamData } from '../interfaces';
import { calculateSingleGameProbability, getTeamAndScheduleData } from './utils';

// ts-node src/scripts/determineExpectedWins.ts

// Import file containing team and schedule data
const totalWeeks = 15;
const currentWeek = 10;
const currentVersion = 0;
const { teams, schedule } = getTeamAndScheduleData({ version: currentVersion, week: currentWeek, year: 2023 });

/**
 * Determine expected values for wins and losses, based on schedule and projected future PPG
 */
const determineExpectedWins = () => {
  const highlightMatchups = 'Holden'; // name to log individual game probabilities for
  const seasonTeams: Record<string, ITeamData> = _.cloneDeep(teams);

  schedule.forEach((matchup) => {
    const teamA = seasonTeams[matchup.home];
    const teamB = seasonTeams[matchup.away];
    const winProbA = calculateSingleGameProbability(teamA.projectedFuturePPG, teamB.projectedFuturePPG);

    if (matchup.home === highlightMatchups || matchup.away === highlightMatchups) {
      console.log(`${matchup.home} vs. ${matchup.away}: ${(winProbA * 100).toFixed(2)}`);
    }

    teamA.wins += winProbA;
    teamA.losses += (1 - winProbA);
    teamA.totalOpponentPoints += teamB.projectedFuturePPG;
    teamB.wins += (1 - winProbA);
    teamB.losses += winProbA;
    teamB.totalOpponentPoints += teamA.projectedFuturePPG;
  });

  Object.values(seasonTeams).forEach((team) => {
    seasonTeams[team.name].totalOpponentPPG = (team.totalOpponentPoints) / (totalWeeks - currentWeek + 1);
  });

  const resultsList = [[
    'Rank',
    'Name',
    'Expected Wins',
    'Expected Losses',
    'SoS (PPG)',
    'SoS (Rank)',
  ]];

  const sortedTeamList = Object.values(seasonTeams).sort((a, b) => (a.wins > b.wins ? -1 : 1));
  const sortedBySoS = Object.values(seasonTeams).sort((a, b) => (a.totalOpponentPoints > b.totalOpponentPoints ? -1 : 1));
  sortedTeamList.forEach((entity, index) => {
    resultsList.push([
      `${index + 1}`,
      entity.name,
      entity.wins.toFixed(2),
      entity.losses.toFixed(2),
      entity.totalOpponentPPG.toFixed(2),
      `${sortedBySoS.findIndex((team) => team.name === entity.name) + 1}`,
    ]);
  });

  console.log(table(resultsList));
};

determineExpectedWins();
