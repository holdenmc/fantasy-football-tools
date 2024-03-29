import * as _ from 'lodash';
import type { ITeamData, IGame } from '../interfaces';
import {
  calculateSingleGameProbability, determineHead2HeadTiebreaker, initializeLookupTable, lookupProbabilityValue,
} from './utils';

// Script for simulating one or many seasons

// TODO: add log level functionality for more verbose logging
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
 *
 * - more performance improvements. this is still all super slow...
 */

// default number of simulations to run
const NUM_SIMULATIONS = 100 * 1000; // 100k for speeeed

/**
 * Determine the proper sorted order of the teams, taking into account tiebreakers
 * @param teams
 * @returns
 */
const determineResults = (params: {
    teams: Record<string, ITeamData>;
}) => {
  const { teams } = params;
  const sortFunc = (a: { wins: number; }, b: { wins: number }) => ((a.wins > b.wins) ? -1 : 1);

  // just sorted by wins, not tiebreakers
  const sortedTeamsByWins = Object.values(teams).sort(sortFunc);
  const totalTeams = sortedTeamsByWins.length;

  const rankingList: ITeamData[] = [];

  for (let i = 0; i < totalTeams; i++) {
    let eligibleTeams = sortedTeamsByWins;

    if (i === 1) {
      // special handling for the 2 seed, which is always the other division winner, regardless of record
      const firstSeedDivision = rankingList[0].division;
      eligibleTeams = Object.values(teams).filter((a) => a.division !== firstSeedDivision).sort(sortFunc);
    }

    let selectedTeam: ITeamData;

    // teams tied with the current first eligible team
    let tiedTeams: ITeamData[];
    if (eligibleTeams.length === 1 || eligibleTeams[0].wins !== eligibleTeams[1].wins) {
      [selectedTeam] = eligibleTeams;
    } else {
      tiedTeams = eligibleTeams.filter((team) => team.wins === eligibleTeams[0].wins);

      if (tiedTeams.length === 2) {
        // console.log(`Evaluating multi-team tie between ${tiedTeams.map(team => team.name).join(', ')}`);
        // first tiebreaker, h2h
        const head2HeadWinner = determineHead2HeadTiebreaker(tiedTeams[0], tiedTeams[1]);

        if (head2HeadWinner) {
          selectedTeam = head2HeadWinner;
          // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie due to outright head to head win`);
        } else {
          // 2nd tiebreaker, points
          selectedTeam = tiedTeams[0].totalPoints > tiedTeams[1].totalPoints ? tiedTeams[0] : tiedTeams[1];
          // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie (${tiedTeams.map(team => team.name).join(',')}) due to highest totalPoints`);
        }
      } else {
        // 3 or more teams
        // console.log(`Evaluating multi-team tie between ${tiedTeams.map(team => team.name).join(', ')}`);
        const outrightHead2HeadWinner = tiedTeams.filter((consideredTeam) => {
          const h2hWinners = tiedTeams
            .filter((team) => team.name !== consideredTeam.name)
            .map((team) => determineHead2HeadTiebreaker(team, consideredTeam));
          return h2hWinners.every((team) => team?.name === consideredTeam.name);
        })[0];

        if (outrightHead2HeadWinner) {
          selectedTeam = outrightHead2HeadWinner;
          // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie due to outright head to head win`);
        } else {
          [selectedTeam] = tiedTeams.sort((a, b) => ((a.totalPoints > b.totalPoints) ? -1 : 1));
          // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie (${tiedTeams.map(team => team.name).join(',')}) due to highest totalPoints`);
        }
      }
    }

    // console.log(`Selected team ${selectedTeam.name} for rank #${i + 1}`);
    const index = sortedTeamsByWins.findIndex((team) => team.name === selectedTeam.name);
    sortedTeamsByWins.splice(index, 1);
    rankingList.push(selectedTeam);
  }

  return rankingList;
};

// Simulate the season once
const runIndividualSimulation = (params: {
    schedule: IGame[],
    teams: Record<string, ITeamData>
}) => {
  const { schedule, teams } = params;
  const seasonTeams = _.cloneDeep(teams);
  schedule.forEach((matchup) => {
    const teamA = seasonTeams[matchup.home];
    const teamB = seasonTeams[matchup.away];
    const winProbA = calculateSingleGameProbability(teamA.projectedFuturePPG, teamB.projectedFuturePPG);

    const result = lookupProbabilityValue();
    if (result <= winProbA) {
      teamA.wins++;
      teamB.losses++;
      teamA.records[teamB.name]++;
      // console.log(`Week ${matchup.week}: ${teamA.name} defeats ${teamB.name} (${(winProbA * 100).toFixed(2)}% chance)`);
    } else {
      teamB.wins++;
      teamA.losses++;
      teamB.records[teamA.name]++;
      // console.log(`Week ${matchup.week}: ${teamB.name} defeats ${teamA.name} (${((1- winProbA) * 100).toFixed(2)}% chance)`);
    }
  });

  return determineResults({ teams: seasonTeams });
};

/**
 * Given 4 playoff teams, simulate their matchups once and return the [winner, runnerup] as an array
 * @param playoffTeams
 * @returns [winner, runnerup]
 */
const simulatePlayoffs = (playoffTeams: ITeamData[]): ITeamData[] => {
  const [oneSeed, twoSeed, threeSeed, fourSeed] = playoffTeams;

  let winnerA: ITeamData;
  let winnerB: ITeamData;

  // first semifinal
  const winProbA = calculateSingleGameProbability(oneSeed.projectedFuturePPG, fourSeed.projectedFuturePPG);
  const resultA = lookupProbabilityValue();

  if (resultA <= winProbA) {
    winnerA = oneSeed;
  } else {
    winnerA = fourSeed;
  }

  // second semifinal
  const winProbB = calculateSingleGameProbability(twoSeed.projectedFuturePPG, threeSeed.projectedFuturePPG);
  const resultB = lookupProbabilityValue();

  if (resultB <= winProbB) {
    winnerB = twoSeed;
  } else {
    winnerB = threeSeed;
  }

  // final
  const winProbChamp = calculateSingleGameProbability(winnerA.projectedFuturePPG, winnerB.projectedFuturePPG);
  const resultChamp = lookupProbabilityValue();

  if (resultChamp <= winProbChamp) {
    return [winnerA, winnerB];
  }
  return [winnerB, winnerA];
};

// Simulate the season multiple times
export const runSimulations = (params: {
    schedule: IGame[];
    teams: Record<string, ITeamData>;
    shouldSimulatePlayoffs?: boolean;
    numSimulations?: number;
}): Record<string, {
  numSeasons: number;
  playoffAppearances: number;
  championships: number;
  runnerUps: number;
  rankings: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
}> => {
  const {
    schedule,
    teams,
    shouldSimulatePlayoffs = false,
    numSimulations = NUM_SIMULATIONS,
  } = params;
  const teamsCopy: Record<string, ITeamData> = _.cloneDeep(teams);

  const statsToAnalyze = Object.keys(teamsCopy).reduce((acc, curr) => {
    acc[curr] = {
      numSeasons: numSimulations,
      playoffAppearances: 0,
      championships: 0,
      runnerUps: 0,
      rankings: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
      },
    };
    return acc;
  }, {});

  initializeLookupTable();

  for (let i = 0; i < numSimulations; i++) {
    if (i % 100000 === 0) {
      console.log(`Completed simulation ${i} out of ${numSimulations}: ${new Date()}`);
    }
    const results = runIndividualSimulation({ schedule, teams: teamsCopy });
    const playoffTeams = results.slice(0, 4);

    playoffTeams.forEach((team, index) => {
      statsToAnalyze[team.name].playoffAppearances++;
      statsToAnalyze[team.name].rankings[`${index + 1}`]++;
    });

    if (shouldSimulatePlayoffs) {
      const [champion, runnerUp] = simulatePlayoffs(playoffTeams);

      statsToAnalyze[champion.name].championships++;
      statsToAnalyze[runnerUp.name].runnerUps++;
    }
  }
  console.log(`Completed simulation ${numSimulations} out of ${numSimulations}: ${new Date()}`);

  return statsToAnalyze;
};

export const generateProbabilityMap = (
  data: Record<string, {
    playoffAppearances: number;
    numSeasons: number;
  }>,
): Record<string, number> => {
  const probabilityMap: Record<string, number> = Object.keys(data)
    .sort((a, b) => (data[a].playoffAppearances > data[b].playoffAppearances ? -1 : 1))
    .reduce((acc, curr) => {
      acc[curr] = ((data[curr].playoffAppearances / data[curr].numSeasons) * 100);
      return acc;
    }, {});

  return probabilityMap;
};

// const { teams: originalTeams, schedule: originalSchedule } = getTeamAndScheduleData({ version: 0, week: 4 });

// runSimulations({
//   schedule: originalSchedule,
//   teams: originalTeams,
//   shouldSimulatePlayoffs: true,
// });
