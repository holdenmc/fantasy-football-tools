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
      Zach: 137.51,
      Jeremy: 132.56,
      Brandon: 145.50,
      Chris: 96.62,
      Carter: 112.96,
      Mike: 129.43,
      Holden: 135.69,
      Jake: 115.82,
      Kevin: 98.78,
      Paul: 132.30,
    }
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
      Brandon: 158.04,
      Holden: 154.88,
      Chris: 164.31,
      Zach: 158.52,
      Paul: 159.85,
      Jacob: 164.02,
      Riley: 164.01,
      Jordan: 159.75,
    }
  }
}
