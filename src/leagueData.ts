/**
 * Relevant league constants to be used during schedule generation
 *
 * idToName is the Fleaflicker team ID mapped to the person's name
 *
 * teamFuturePPG is pulled manually from footballguys' free league dominator tool: https://league.footballguys.com/#fbgroster/forecast/points
 * Last updated: 11/26/24 9:30am
 */

export type LeagueId = 183250 | 345994;

export const leagues = {
  183250: {
    idToName: {
      1245039: 'Carter',
      1259806: 'Kevin',
      1245697: 'Brandon',
      1246726: 'Holden',
      1251378: 'Jake',
      1247091: 'Chris',
      1248871: 'Mike',
      1245860: 'Zach',
      1247364: 'Jeremy',
      1244239: 'Paul',
    },
    teamFuturePPG: {
      Brandon: 157.09,
      Holden: 153.49,
      Mike: 143.96,
      Jeremy: 132.15,
      Zach: 130.87,
      Paul: 127.75,
      Kevin: 125.17,
      Jake: 107.56,
      Carter: 98.72,
      Chris: 89.92,
    },
  },
  345994: {
    idToName: {
      1777477: 'Brandon',
      1777462: 'Holden',
      1777460: 'Chris',
      1777461: 'Zach',
      1777466: 'Paul',
      1777489: 'Jacob',
      1780360: 'Riley',
      1777463: 'Jordan',
    },
    teamFuturePPG: {
      Chris: 193.96,
      Zach: 173.82,
      Paul: 173.40,
      Holden: 159.88,
      Jacob: 159.84,
      Riley: 159.20,
      Jordan: 158.18,
      Brandon: 124.49,
    },
  },
};

export const divisions = {
  // DRL League only, Han Dynasty doesn't have division record tiebreaker
  'Division 1': ['Chris', 'Holden', 'Paul', 'Riley'],
  'Division 2': ['Zach', 'Jordan', 'Jacob', 'Brandon'],
};

export const hasDivisionTiebreaker = (leagueId: LeagueId) => leagueId === 345994;
