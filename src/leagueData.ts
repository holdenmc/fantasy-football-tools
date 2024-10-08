/**
 * Relevant league constants to be used during schedule generation
 *
 * idToName is the Fleaflicker team ID mapped to the person's name
 *
 * teamFuturePPG is pulled manually from footballguys' free league dominator tool: https://league.footballguys.com/#fbgroster/forecast/points
 * Last updated: 10/8/24 9:00pm
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
      Brandon: 136.17,
      Mike: 133.68,
      Zach: 133.05,
      Jeremy: 132.34,
      Holden: 126.99,
      Paul: 119.61,
      Kevin: 106.94,
      Carter: 102.77,
      Jake: 102.34,
      Chris: 88.72,
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
      Zach: 167.62,
      Jordan: 158.80,
      Chris: 153.43,
      Riley: 151.59,
      Paul: 150.73,
      Jacob: 149.78,
      Holden: 149.12,
      Brandon: 143.81,
    },
  },
};
