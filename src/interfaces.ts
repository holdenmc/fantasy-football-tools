export interface ITeamData {
    name: string;
    wins: number;
    losses: number;
    totalPoints: number;
    projectedFuturePPG: number;
    division: string;
    records: Record<string, number>; // wins over opponent i.e. if a team beat Carter once and me twice { Carter: 1, Holden: 2 }
    // playoffAppearances: number;
    // championships: number;
    // runnerUps: number;
    // rankings: Record<string, number>;
}

export interface IGame {
    home: string;
    away: string;
    week: number;
}