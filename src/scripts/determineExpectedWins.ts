import path from 'path';
import fs from 'fs';
import { IGame, ITeamData } from '../interfaces';
import { calculateSingleGameProbability } from './utils';
import { table } from 'table';
import _ from 'lodash';

// ts-node src/scripts/determineExpectedWins.ts

// Import file containing team and schedule data
const currentWeek = 12;
const dataFilePath = path.join(__dirname, `../data/teamSchedules/2021-${currentWeek}.json`);
const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

const teams: Record<string, ITeamData> = teamAndScheduleData.teams;
const schedule: IGame[] = teamAndScheduleData.schedule;

/**
 * Determine expected values for wins and losses, based on schedule and projected future PPG
 */
const determineExpectedWins = () => {
    const highlightMatchups = 'Holden'; // name to log individual game probabilities for
    const seasonTeams: Record<string, ITeamData> = _.cloneDeep(teams);

    for (const matchup of schedule) {
        const teamA = seasonTeams[matchup.home];
        const teamB = seasonTeams[matchup.away];
        let winProbA = calculateSingleGameProbability(teamA.projectedFuturePPG, teamB.projectedFuturePPG);

        if (matchup.home === highlightMatchups || matchup.away === highlightMatchups) {
            console.log(`${matchup.home} vs. ${matchup.away}: ${(winProbA * 100).toFixed(2)}`);
        }

        teamA.wins += winProbA;
        teamA.losses += (1 - winProbA);
        teamB.wins += (1 - winProbA);
        teamB.losses += winProbA;
    }

    const resultsList = [[
        'Rank',
        'Name',
        'Expected Wins',
        'Expected Losses'
    ]];

    const sortedTeamList = Object.values(seasonTeams).sort((a, b) => a.wins > b.wins ? -1 : 1);
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