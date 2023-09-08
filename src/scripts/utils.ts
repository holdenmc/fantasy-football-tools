import fs from 'fs';
import path from 'path';
import { IGame, ITeamData } from '../interfaces';

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

export const currentYear = 2023;

export const getTeamAndScheduleData = (options: { version?: number, week?: number, year?: number } = {}): { teams: Record<string, ITeamData>; schedule: IGame[]; } => {
  // Import file containing team and schedule data
  const { version = 0, week = 1, year = 2023 } = options;
  const dataFilePath = path.join(__dirname, `../data/teamSchedules/${year}-${week}-${version}.json`);
  const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  return teamAndScheduleData;
};
