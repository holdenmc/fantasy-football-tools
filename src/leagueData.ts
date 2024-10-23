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
      Brandon: 139.17,
      Holden: 131.23,
      Jeremy: 130.68,
      Zach: 128.46,
      Paul: 127.43,
      Mike: 126.18,
      Kevin: 113.57,
      Carter: 102.72,
      Jake: 97.97,
      Chris: 86.53,
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
      Zach: 166.87,
      Jordan: 155.99,
      Paul: 155.59,
      Chris: 153.90,
      Riley: 152.66,
      Jacob: 145.05,
      Holden: 144.04,
      Brandon: 139.45,
    },
  },
};
