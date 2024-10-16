/**
 * Relevant league constants to be used during schedule generation
 *
 * idToName is the Fleaflicker team ID mapped to the person's name
 *
 * teamFuturePPG is pulled manually from footballguys' free league dominator tool: https://league.footballguys.com/#fbgroster/forecast/points
 * Last updated: 10/16/24 11:00am
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
      Brandon: 136.54,
      Jeremy: 130.54,
      Mike: 129.54,
      Holden: 128.98,
      Zach: 126.68,
      Paul: 122.42,
      Kevin: 107.82,
      Carter: 103.83,
      Jake: 99.12,
      Chris: 85.13,
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
      Zach: 166.83,
      Jordan: 157.35,
      Paul: 153.20,
      Chris: 151.86,
      Jacob: 148.33,
      Riley: 147.38,
      Holden: 143.48,
      Brandon: 137.12,
    },
  },
};
