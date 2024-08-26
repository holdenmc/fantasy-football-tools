import fs from 'fs';
import path from 'path';
import { LeagueId, leagues } from '../leagueData';

// ts-node src/scripts/generateManualTeamSchedule.ts

/**
 * Manually generates a league schedule before Paul has updated Fleaflicker
 *
 * If this needs to be run for league 345994 - it will need more refactoring
 */

// 183250 or 345994
const leagueId: LeagueId = 183250;
const maxWeeks = 15;
const currentYear = 2024;
const version = 1;

const { teamFuturePPG, idToName } = leagues[leagueId];

const divisions = [{
  name: '3-Cup Chickens',
  teams: [
    'Carter',
    'Kevin',
    'Brandon',
    'Jake',
    'Paul',
  ],
}, {
  name: 'Dan Dan Noodles',
  teams: [
    'Chris',
    'Zach',
    'Jeremy',
    'Mike',
    'Holden',
  ],
}];

const computeTeams = async () => {
  const teams = Object.values(idToName).reduce((acc, curr) => {
    acc[curr] = {
      name: curr,
      records: {},
    };
    Object.values(idToName).filter((name) => name !== curr).forEach((name) => {
      acc[curr].records[name] = 0;
    });
    return acc;
  }, {});

  divisions.forEach((division) => {
    const divisionName = division.name;
    division.teams.forEach((team) => {
      teams[team].wins = 0;
      teams[team].losses = 0;
      teams[team].division = divisionName;
      teams[team].totalPoints = 0;
      teams[team].totalOpponentPoints = 0;
      teams[team].totalOpponentPPG = 0;
    });
  });

  // compute total points for tiebreakers by adding projections
  Object.keys(teams).forEach((ownerName) => {
    teams[ownerName].projectedFuturePPG = teamFuturePPG[ownerName];
    const remainingWeeks = maxWeeks;
    teams[ownerName].totalPoints += remainingWeeks * teams[ownerName].projectedFuturePPG;
  });

  return teams;
};

const computeSchedules = async () => {
  const schedule: { home: string; away: string; week: number; }[] = [];

  // divisional games x8
  divisions.forEach((division) => {
    for (let i = 0; i < division.teams.length - 1; i++) {
      for (let j = i + 1; j < division.teams.length; j++) {
        schedule.push({ home: division.teams[i], away: division.teams[j], week: 0 });
        schedule.push({ home: division.teams[j], away: division.teams[i], week: 0 });
      }
    }
  });

  // non-divisional games x5
  divisions[0].teams.forEach((divisionZeroteam, divisionZeroIndex) => {
    divisions[1].teams.forEach((divisionOneTeam, divisionOneIndex) => {
      schedule.push({ home: divisionZeroteam, away: divisionOneTeam, week: 0 });

      // non-divisional extra game x1
      if (divisionZeroIndex === divisionOneIndex) {
        schedule.push({ home: divisionOneTeam, away: divisionZeroteam, week: 0 });
      }
    });
  });

  // 1x game against the median
  const topHalf = Object.keys(teamFuturePPG).slice(0, 5);
  const bottomHalf = Object.keys(teamFuturePPG).slice(5, 10);
  topHalf.forEach((name, index) => {
    schedule.push({ home: name, away: bottomHalf[bottomHalf.length - 1 - index], week: 0 });
  });

  // console.log(schedule.length); // should be 75

  // console.log(JSON.stringify(schedule, null, 2));
  return schedule;
};

const computeAndWriteToFile = async () => {
  const fileData = {
    teams: await computeTeams(),
    schedule: await computeSchedules(),
  };
  const currentWeek = 1;
  const filePath = path.join(__dirname, `../data/teamSchedules/${leagueId}/${currentYear}/${currentYear}-${currentWeek}-${version}.json`);
  fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
};

computeAndWriteToFile();
