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
      Brandon: 144.72,
      Zach: 133.48,
      Holden: 133.26,
      Jeremy: 131.68,
      Paul: 128.69,
      Mike: 126.23,
      Kevin: 113.33,
      Carter: 107.13,
      Jake: 100.01,
      Chris: 88.63,
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
      Zach: 173.27,
      Chris: 161.34,
      Paul: 159.67,
      Jordan: 159.60,
      Riley: 158.23,
      Holden: 143.49,
      Jacob: 142.81,
      Brandon: 139.95,
    },
  },
};
