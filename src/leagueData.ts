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
      Brandon: 140.07,
      Holden: 138.56,
      Zach: 132.07,
      Jeremy: 130.66,
      Paul: 129.95,
      Mike: 128.77,
      Kevin: 109.07,
      Carter: 102.35,
      Jake: 101.50,
      Chris: 89.99,
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
      Zach: 167.55,
      Paul: 160.47,
      Jordan: 160.42,
      Chris: 159.78,
      Riley: 154.33,
      Jacob: 142.06,
      Holden: 141.27,
      Brandon: 135.23,
    },
  },
};
