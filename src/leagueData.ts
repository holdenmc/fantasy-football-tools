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
      Brandon: 142.58,
      Holden: 137.39,
      Zach: 135.28,
      Jeremy: 131.32,
      Paul: 130.49,
      Mike: 127.34,
      Kevin: 111.49,
      Carter: 106.60,
      Jake: 95.53,
      Chris: 87.17,
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
      Zach: 172.83,
      Chris: 163.40,
      Paul: 160.20,
      Jordan: 159.18,
      Riley: 157.84,
      Jacob: 145.03,
      Holden: 142.77,
      Brandon: 138.98,
    },
  },
};
