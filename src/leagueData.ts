/**
 * Relevant league constants to be used during schedule generation
 *
 * idToName is the Fleaflicker team ID mapped to the person's name
 *
 * teamFuturePPG is pulled manually from footballguys' free league dominator tool: https://league.footballguys.com/#fbgroster/forecast/points
 * Last updated: 11/13/24 9:15am
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
      Brandon: 147.31,
      Holden: 143.31,
      Zach: 136.61,
      Mike: 133.12,
      Jeremy: 132.95,
      Paul: 132.25,
      Kevin: 120.72,
      Carter: 109.01,
      Jake: 107.55,
      Chris: 92.86,
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
      Chris: 179.51,
      Zach: 174.16,
      Jordan: 166.96,
      Paul: 163.21,
      Riley: 162.14,
      Jacob: 152.25,
      Holden: 151.27,
      Brandon: 134.03,
    },
  },
};
