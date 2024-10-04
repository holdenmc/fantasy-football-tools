/**
 * Relevant league constants to be used during schedule generation
 *
 * idToName is the Fleaflicker team ID mapped to the person's name
 *
 * teamFuturePPG is pulled manually from footballguys' free league dominator tool: https://league.footballguys.com/#fbgroster/forecast/points
 * Last updated: 8/25/24 8:20pm
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
      Zach: 130.72,
      Jeremy: 129.84,
      Brandon: 129.34,
      Chris: 91.14,
      Carter: 99.17,
      Mike: 129.17,
      Holden: 124.72,
      Jake: 102.67,
      Kevin: 100.62,
      Paul: 117.07,
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
      Brandon: 140.28,
      Holden: 146.84,
      Chris: 145.69,
      Zach: 164.01,
      Paul: 146.46,
      Jacob: 145.28,
      Riley: 149.03,
      Jordan: 156.66,
    },
  },
};
