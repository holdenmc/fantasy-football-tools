import fs from 'fs';
import path from 'path';
import { IGame, ITeamData } from '../interfaces';
import { divisions } from '../leagueData';

// not sure if this is a good assumption, can always modify and see how it changes
// I backed into this, comparing it to yahoo win probabilities for future matchups in another league.
// Within a percentage point of 6 matchups I checked there, but it may be overfit to a certain range
const PYTHAGOREAN_CONSTANT = 4.6;

const probabilityCache = {};

export const calculateSingleGameProbability = (
  pointsFor: number,
  pointsAgainst: number,
): number => {
  const cacheKey = `${pointsFor}^${pointsAgainst}`;

  if (probabilityCache[cacheKey]) {
    return probabilityCache[cacheKey];
  }

  const probability = (pointsFor ** PYTHAGOREAN_CONSTANT) / (pointsFor ** PYTHAGOREAN_CONSTANT + pointsAgainst ** PYTHAGOREAN_CONSTANT);
  probabilityCache[cacheKey] = probability;

  return probability;
};

let index = 0;
const limit = 100 * 1000;
const lookupTable: number[] = [];
export const lookupProbabilityValue = (): number => {
  if (index > limit - 1) {
    index = 0;
  }
  const result = lookupTable[index];
  index++;
  return result;
};

export const initializeLookupTable = () => {
  for (let i = 0; i < limit; i++) {
    lookupTable.push(Math.random());
  }
};

/**
 * Given two teams, determine who wins a h2h tiebreaker, returns null if neither
 * @param teamA
 * @param teamB
 * @returns winning team or null
 */
export const determineHead2HeadTiebreaker = (
  teamA: ITeamData,
  teamB: ITeamData,
): ITeamData | null => {
  const teamAWins = teamA.records?.[teamB.name] ?? 0;
  const teamBWins = teamB.records?.[teamA.name] ?? 0;

  if (teamAWins > teamBWins) {
    return teamA;
  } if (teamBWins > teamAWins) {
    return teamB;
  }

  return null;
};

export const determineDivisionWins = (team: ITeamData): number => {
  const { division, records } = team;
  const teamsInDivision = divisions[division].filter((name: string) => name !== team.name);

  return teamsInDivision.reduce((totalWins: number, teamName: string) => totalWins + records[teamName], 0);
};

export const getTeamAndScheduleData = (options: { version?: number, week?: number, year?: number, leagueId: number }): { teams: Record<string, ITeamData>; schedule: IGame[]; } => {
  // Import file containing team and schedule data
  const {
    version = 0, week = 1, year = 2024, leagueId,
  } = options;
  const dataFilePath = path.join(__dirname, `../data/teamSchedules/${leagueId}/${year}/${year}-${week}-${version}.json`);
  const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  return teamAndScheduleData;
};
