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
      Holden: 148.66,
      Brandon: 145.56,
      Zach: 135.81,
      Mike: 134.02,
      Jeremy: 131.76,
      Paul: 130.74,
      Kevin: 123.41,
      Carter: 104.01,
      Jake: 102.88,
      Chris: 90.37,
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
      Chris: 185.61,
      Zach: 170.32,
      Paul: 169.17,
      Riley: 162.65,
      Jacob: 159.74,
      Holden: 159.41,
      Jordan: 154.62,
      Brandon: 119.16,
    },
  },
};

export const divisions = {
  // DRL League only, Han Dynasty doesn't have division record tiebreaker
  'Division 1': ['Chris', 'Holden', 'Paul', 'Riley'],
  'Division 2': ['Zach', 'Jordan', 'Jacob', 'Brandon'],
};

export const hasDivisionTiebreaker = (leagueId: LeagueId) => leagueId === 345994;
