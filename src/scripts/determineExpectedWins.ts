import { table } from 'table';
import * as _ from 'lodash';
import { ITeamData } from '../interfaces';
import { calculateSingleGameProbability, getTeamAndScheduleData } from './utils';

// ts-node src/scripts/determineExpectedWins.ts

// Import file containing team and schedule data
const { teams, schedule } = getTeamAndScheduleData();

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
    teamB.wins += (1 - winProbA);
    teamB.losses += winProbA;
  });

  const resultsList = [[
    'Rank',
    'Name',
    'Expected Wins',
    'Expected Losses',
  ]];

  const sortedTeamList = Object.values(seasonTeams).sort((a, b) => (a.wins > b.wins ? -1 : 1));
  sortedTeamList.forEach((entity, index) => {
    resultsList.push([
      `${index + 1}`,
      entity.name,
      entity.wins.toFixed(2),
      entity.losses.toFixed(2),
    ]);
  });

  console.log(table(resultsList));
};

determineExpectedWins();
