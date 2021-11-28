import _ from "lodash";
import path from "path";
import { table } from "table";
import { ITeamData, IGame } from "../interfaces";
import { calculateSingleGameProbability, determineHead2HeadTiebreaker } from "./utils";
import fs from 'fs';

// ts-node src/scripts/simulations.ts

// Import file containing team and schedule data
const currentWeek = 12;
const dataFilePath = path.join(__dirname, `../data/teamSchedules/2021-${currentWeek}.json`);
const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

const teams: Record<string, ITeamData> = teamAndScheduleData.teams;
const schedule: IGame[] = teamAndScheduleData.schedule;

// default number of simulations to run
const NUM_SIMULATIONS = 1000000; // 1 mil

/**
 * Determine the proper sorted order of the teams, taking into account tiebreakers
 * @param teams
 * @returns
 */
const determineResults = (teams: Record<string, ITeamData>) => {
    const sortFunc = (a: { wins: number; }, b: { wins: number }) => {
        return (a.wins > b.wins) ? -1 : 1;
    };

    // just sorted by wins, not tiebreakers
    const sortedTeamsByWins = Object.values(teams).sort(sortFunc);

    const rankedNames: string[] = [];
    const rankingList: ITeamData[] = [];

    for (let i = 0; i < sortedTeamsByWins.length; i++) {
        let eligibleTeams = sortedTeamsByWins.filter((team) => !rankedNames.includes(team.name));

        if (i === 1) {
            // special handling for the 2 seed, which is always the other division winner, regardless of record
            const firstSeedDivision = rankingList[0].division;
            eligibleTeams = Object.values(teams).filter(a => a.division !== firstSeedDivision).sort(sortFunc);
        }

        const tiedTeams = eligibleTeams.filter((team) => team.wins === eligibleTeams[0].wins);
        let selectedTeam: ITeamData;

        if (tiedTeams.length === 1) {
            selectedTeam = tiedTeams[0];
        } else if (tiedTeams.length === 2) {
            // console.log(`Evaluating multi-team tie between ${tiedTeams.map(team => team.name).join(', ')}`);
            // first tiebreaker, h2h
            const head2HeadWinner = determineHead2HeadTiebreaker(tiedTeams[0], tiedTeams[1]);

            if (head2HeadWinner) {
                selectedTeam = head2HeadWinner;
                // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie due to outright head to head win`);
            } else {
                // 2nd tiebreaker, points
                selectedTeam = tiedTeams[0].totalPoints > tiedTeams[1].totalPoints ? tiedTeams[0] : tiedTeams[1];
                // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie (${tiedTeams.map(team => team.name).join(',')}) due to highest totalPoints`);
            }
        } else {
            // 3 or more teams
            let outrightHead2HeadWinner;

            // console.log(`Evaluating multi-team tie between ${tiedTeams.map(team => team.name).join(', ')}`);
            outrightHead2HeadWinner = tiedTeams.filter((consideredTeam) => {
                const h2hWinners = tiedTeams.filter((team) => team.name !== consideredTeam.name).map((team) => determineHead2HeadTiebreaker(team, consideredTeam));
                return h2hWinners.every((team) => team?.name === consideredTeam.name);
            })[0];

            if (outrightHead2HeadWinner) {
                selectedTeam = outrightHead2HeadWinner;
                // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie due to outright head to head win`);
            } else {
                selectedTeam = tiedTeams.sort((a, b) => (a.totalPoints > b.totalPoints) ? -1 : 1)[0];
                // console.log(`Selected team ${selectedTeam.name} from ${tiedTeams.length}-way tie (${tiedTeams.map(team => team.name).join(',')}) due to highest totalPoints`);
            }
        }

        // console.log(`Selected team ${selectedTeam.name} for rank #${i + 1}`);
        rankedNames.push(selectedTeam.name);
        rankingList.push(selectedTeam);
    }

    const resultsList = [[
        'Rank',
        'Name',
        'Wins',
        'Losses'
    ]];
    rankingList.forEach((entity, index) => {
        resultsList.push([
            `${index + 1}`,
            entity.name,
            entity.wins.toFixed(2),
            entity.losses.toFixed(2),
        ]);
    });

    // console.log(teams);
    // console.log(table(resultsList));
    return rankingList;
};

// Simulate the season once
const runIndividualSimulation = (params: {
    schedule: IGame[],
    teams: Record<string, ITeamData>
}) => {
    const { schedule, teams } = params;
    const seasonTeams = _.cloneDeep(teams);
    for (const matchup of schedule) {
        const teamA = seasonTeams[matchup.home];
        const teamB = seasonTeams[matchup.away];
        const winProbA = calculateSingleGameProbability(teamA.projectedFuturePPG, teamB.projectedFuturePPG);

        const result = Math.random();
        if (result <= winProbA) {
            teamA.wins++;
            teamB.losses++;
            teamA.records[teamB.name]++;
            // console.log(`Week ${matchup.week}: ${teamA.name} defeats ${teamB.name} (${(winProbA * 100).toFixed(2)}% chance)`);
        } else {
            teamB.wins++;
            teamA.losses++;
            teamB.records[teamA.name]++;
            // console.log(`Week ${matchup.week}: ${teamB.name} defeats ${teamA.name} (${((1- winProbA) * 100).toFixed(2)}% chance)`);
        }
    }

    return determineResults(seasonTeams);
};

/**
 * Given 4 playoff teams, simulate their matchups once and return the [winner, runnerup] as an array
 * @param playoffTeams
 * @returns [winner, runnerup]
 */
const simulatePlayoffs = (playoffTeams: ITeamData[]): ITeamData[] => {
    const oneSeed = playoffTeams[0];
    const twoSeed = playoffTeams[1];
    const threeSeed = playoffTeams[2];
    const fourSeed = playoffTeams[3];

    let winnerA: ITeamData, winnerB: ITeamData;

    // first semifinal
    let winProbA = calculateSingleGameProbability(oneSeed.projectedFuturePPG, fourSeed.projectedFuturePPG);
    const resultA = Math.random();

    if (resultA <= winProbA) {
        winnerA = oneSeed;
    } else {
        winnerA = fourSeed;
    }

    // second semifinal
    let winProbB = calculateSingleGameProbability(twoSeed.projectedFuturePPG, threeSeed.projectedFuturePPG);
    const resultB = Math.random();

    if (resultB <= winProbB) {
        winnerB = twoSeed;
    } else {
        winnerB = threeSeed;
    }

    // final
    let winProbChamp = calculateSingleGameProbability(winnerA.projectedFuturePPG, winnerB.projectedFuturePPG);
    const resultChamp = Math.random();

    if (resultChamp <= winProbChamp) {
        return [winnerA, winnerB];
    } else {
        return [winnerB, winnerA];
    }
};

// Simulate the season multiple times
export const runSimulations = (params: {
    schedule: IGame[];
    teams: Record<string, ITeamData>;
    shouldSimulatePlayoffs?: boolean;
    logResults?: boolean;
    numSimulations?: number;
}) => {
    const {
        schedule,
        teams,
        shouldSimulatePlayoffs = false,
        logResults = false,
        numSimulations = NUM_SIMULATIONS,
    } = params;
    const teamsCopy: Record<string, ITeamData> = _.cloneDeep(teams);

    const statsToAnalyze = Object.keys(teamsCopy).reduce((acc, curr) => {
        acc[curr] = {
            playoffAppearances: 0,
            championships: 0,
            runnerUps: 0,
            rankings: {
                '1': 0,
                '2': 0,
                '3': 0,
                '4': 0,
            }
        };
        return acc;
    }, {});

    for (let i = 0; i < numSimulations; i++) {
        const results = runIndividualSimulation({ schedule, teams: teamsCopy });
        const playoffTeams = results.slice(0, 4);

        playoffTeams.forEach((team, index) => {
            statsToAnalyze[team.name].playoffAppearances++;
            statsToAnalyze[team.name].rankings[`${index + 1}`]++;
        });

        if (shouldSimulatePlayoffs) {
            const [champion, runnerUp] = simulatePlayoffs(playoffTeams);

            statsToAnalyze[champion.name].championships++;
            statsToAnalyze[runnerUp.name].runnerUps++;
        }
    }

    // TODO: separate this logging logic from the actual simulation logic
    const resultsList = [[
        'Rank',
        'Name',
        '% Playoffs',
        '% 1st',
        '% 2nd',
        '% 3rd',
        '% 4th',
        ...(shouldSimulatePlayoffs ? [
            '% Appear in Final',
            '% Runner Up',
            '% Champion',
        ] : []),
    ]];

    const sortedTeamList = Object.values(teamsCopy).sort((a, b) =>
        (
            statsToAnalyze[a.name].playoffAppearances > statsToAnalyze[b.name].playoffAppearances
        ) ? -1 : 1
    );

    const getStringPercentage = (value) => (value / numSimulations * 100).toFixed(2);

    sortedTeamList.forEach((entity, index) => {
        const teamStats = statsToAnalyze[entity.name];
        resultsList.push([
            `${index + 1}`,
            entity.name,
            getStringPercentage(teamStats.playoffAppearances),
            getStringPercentage(teamStats.rankings['1']),
            getStringPercentage(teamStats.rankings['2']),
            getStringPercentage(teamStats.rankings['3']),
            getStringPercentage(teamStats.rankings['4']),
            ...(shouldSimulatePlayoffs ? [
                getStringPercentage((teamStats.championships + teamStats.runnerUps)),
                getStringPercentage(teamStats.runnerUps),
                getStringPercentage(teamStats.championships),
            ] : []),
        ]);
    });

    if (logResults) {
        console.log(table(resultsList));
    }

    const probabilityMap: Record<string, number> = sortedTeamList.reduce((acc, curr) => {
        acc[curr.name] = (statsToAnalyze[curr.name].playoffAppearances / numSimulations * 100);
        return acc;
    }, {});

    return probabilityMap;
};

// runIndividualSimulation({ schedule, teams });
runSimulations({ schedule, teams, logResults: true });
