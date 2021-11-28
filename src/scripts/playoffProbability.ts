import { table } from 'table';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { IGame, ITeamData } from '../interfaces';

// An independent script that calculates teams odds of making the playoffs
// ts-node src/scripts/playoffProbability.ts

// TODO: split this script into separate scripts

/**
 * Flaws in this analysis
 * - Relies on projected future PPG from FBG's projection system
 * - Assumes season-end total ppg = current total + games remaining * future ppg
 *   but that doesn't take into account wins/losses. i.e. if I win some game as an underdog, I probably overperformed my ppg
 * - individual game win probability model might be overfit, hard to say
 * - assumes future ppg is the same every week
 */

/**
 * Future improvements
 * - Determine highest leverage games for a given team owner
 *    - for each game on my schedule, calculate win probability removing it from simulation and setting result and compare
 *
 * - Add ability to highlight a specific result - like when does Jeremy ever make the playoffs
 *    - could persist simulation results in a db and make them queryable
 */

// Import file containing team and schedule data
const currentWeek = 12;
const dataFilePath = path.join(__dirname, `../data/teamSchedules/2021-${currentWeek}.json`);
const teamAndScheduleData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

const teams: Record<string, ITeamData> = teamAndScheduleData.teams;
const schedule: IGame[] = teamAndScheduleData.schedule;

const NUM_SIMULATIONS = 1000000; // 1 mil

// not sure if this is a good assumption, can always modify and see how it changes
// I backed into this, comparing it to yahoo win probabilities for future matchups in another league.
// Within a percentage point of 6 matchups I checked there, but it may be overfit to a certain range
const PYTHAGOREAN_CONSTANT = 4.6;
const calculatePythagoreanExpectation = (pointsFor: number, pointsAgainst: number): number => {
    return (Math.pow(pointsFor, PYTHAGOREAN_CONSTANT)) / (Math.pow(pointsFor, PYTHAGOREAN_CONSTANT) + Math.pow(pointsAgainst, PYTHAGOREAN_CONSTANT));
};

/**
 * Determine expected values for wins and losses, based on schedule and projected future PPG
 */
const determineExpectedWins = () => {
    const highlightMatchups = 'Holden'; // name to log individual game probabilities for
    const seasonTeams: Record<string, ITeamData> = _.cloneDeep(teams);

    for (const matchup of schedule) {
        const teamA = seasonTeams[matchup.home];
        const teamB = seasonTeams[matchup.away];
        let winProbA = calculatePythagoreanExpectation(teamA.projectedFuturePPG, teamB.projectedFuturePPG);

        if (matchup.home === highlightMatchups || matchup.away === highlightMatchups) {
            console.log(`${matchup.home} vs. ${matchup.away}: ${(winProbA * 100).toFixed(2)}`);
        }

        teamA.wins += winProbA;
        teamA.losses += (1 - winProbA);
        teamB.wins += (1 - winProbA);
        teamB.losses += winProbA;
    }

    const resultsList = [[
        'Rank',
        'Name',
        'Expected Wins',
        'Expected Losses'
    ]];

    const sortedTeamList = Object.values(seasonTeams).sort((a, b) => a.wins > b.wins ? -1 : 1);
    sortedTeamList.forEach((entity, index) => {
        resultsList.push([
            `${index + 1}`,
            entity.name,
            entity.wins.toFixed(2),
            entity.losses.toFixed(2),
        ]);
    });

    console.log(table(resultsList));
};

const determineHead2HeadTiebreaker = (teamA: ITeamData, teamB: ITeamData): ITeamData | null => {
    const teamAWins = teamA.records?.[teamB.name] ?? 0;
    const teamBWins = teamB.records?.[teamA.name] ?? 0;

    if (teamAWins > teamBWins) {
        return teamA;
    } else if (teamBWins > teamAWins) {
        return teamB;
    }

    return null;
};

const determineResults = (seasonTeams: typeof teams) => {
    const sortFunc = (a, b) => {
        return (a.wins > b.wins) ? -1 : 1;
    };

    // just sorted by wins, not tiebreakers
    const sortedTeamsByWins = Object.values(seasonTeams).sort(sortFunc);

    const rankedNames: string[] = [];
    const rankingList: ITeamData[] = [];

    for (let i = 0; i < sortedTeamsByWins.length; i++) {
        let eligibleTeams = sortedTeamsByWins.filter((team) => !rankedNames.includes(team.name));

        if (i === 1) {
            // special handling for the 2 seed, which s always the other division winner, regardless of record
            const firstSeedDivision = rankingList[0].division;
            eligibleTeams = Object.values(seasonTeams).filter(a => a.division !== firstSeedDivision).sort(sortFunc);
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
            // 3 or more teams - can that even be generalized?
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

    // console.log(seasonTeams);
    // console.log(table(resultsList));
    return rankingList;
};

// Simulate the season once
const runIndividualSimulation = (schedule: IGame[], teams: Record<string, ITeamData>) => {
    const seasonTeams = _.cloneDeep(teams);
    for (const matchup of schedule) {
        const teamA = seasonTeams[matchup.home];
        const teamB = seasonTeams[matchup.away];
        let winProbA = calculatePythagoreanExpectation(teamA.projectedFuturePPG, teamB.projectedFuturePPG);

        const result = Math.random();
        if (result <= winProbA) {
            teamA.wins++;
            teamB.losses++;
            if (!teamA.records[teamB.name]) {
                teamA.records[teamB.name] = 0;
            }
            teamA.records[teamB.name]++;
            // console.log(`Week ${matchup.week}: ${teamA.name} defeats ${teamB.name} (${(winProbA * 100).toFixed(2)}% chance)`);
        } else {
            teamB.wins++;
            teamA.losses++;
            if (!teamB.records[teamA.name]) {
                teamB.records[teamA.name] = 0;
            }
            teamB.records[teamA.name]++;
            // console.log(`Week ${matchup.week}: ${teamB.name} defeats ${teamA.name} (${((1- winProbA) * 100).toFixed(2)}% chance)`);
        }
    }

    return determineResults(seasonTeams);
};

/**
 * Given 4 playoff teams, simulate their matchups once and return the [winner, runnerup] as an array
 * @param playoffTeams
 * @returns
 */
const simulatePlayoffs = (playoffTeams: ITeamData[]) => {
    const oneSeed = playoffTeams[0];
    const twoSeed = playoffTeams[1];
    const threeSeed = playoffTeams[2];
    const fourSeed = playoffTeams[3];

    let winnerA: ITeamData, winnerB: ITeamData;

    // first semifinal
    let winProbA = calculatePythagoreanExpectation(oneSeed.projectedFuturePPG, fourSeed.projectedFuturePPG);
    const resultA = Math.random();

    if (resultA <= winProbA) {
        winnerA = oneSeed;
    } else {
        winnerA = fourSeed;
    }

    // second semifinal
    let winProbB = calculatePythagoreanExpectation(twoSeed.projectedFuturePPG, threeSeed.projectedFuturePPG);
    const resultB = Math.random();

    if (resultB <= winProbB) {
        winnerB = twoSeed;
    } else {
        winnerB = threeSeed;
    }

    // final
    let winProbChamp = calculatePythagoreanExpectation(winnerA.projectedFuturePPG, winnerB.projectedFuturePPG);
    const resultChamp = Math.random();

    if (resultChamp <= winProbChamp) {
        return [winnerA, winnerB];
    } else {
        return [winnerB, winnerA];
    }
};

// Simulate the season NUM_SIMULATIONS times
const runSimulations = (schedule: IGame[], teams: Record<string, ITeamData>) => {
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

    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        const results = runIndividualSimulation(schedule, teamsCopy);
        const playoffTeams = results.slice(0, 4);

        const [champion, runnerUp] = simulatePlayoffs(playoffTeams);

        playoffTeams.forEach((team, index) => {
            statsToAnalyze[team.name].playoffAppearances++;
            statsToAnalyze[team.name].rankings[`${index + 1}`]++;
        });

        statsToAnalyze[champion.name].championships++;
        statsToAnalyze[runnerUp.name].runnerUps++;
    }

    const resultsList = [[
        'Rank',
        'Name',
        // 'Appearances',
        '% Playoffs',
        '% 1st',
        '% 2nd',
        '% 3rd',
        '% 4th',
        // '% Appear in Final',
        // '% Runner Up',
        // '% Champion',
    ]];

    const sortedTeamList = Object.values(teamsCopy).sort((a, b) =>
        (
            statsToAnalyze[a.name].playoffAppearances > statsToAnalyze[b.name].playoffAppearances
        ) ? -1 : 1
    );

    const getStringPercentage = (value) => (value / NUM_SIMULATIONS * 100).toFixed(2);

    sortedTeamList.forEach((entity, index) => {
        resultsList.push([
            `${index + 1}`,
            entity.name,
            // entity.playoffAppearances.toString(),
            getStringPercentage(statsToAnalyze[entity.name].playoffAppearances),
            getStringPercentage(statsToAnalyze[entity.name].rankings['1']),
            getStringPercentage(statsToAnalyze[entity.name].rankings['2']),
            getStringPercentage(statsToAnalyze[entity.name].rankings['3']),
            getStringPercentage(statsToAnalyze[entity.name].rankings['4']),
            // ((entity.championships + entity.runnerUps) / NUM_SIMULATIONS * 100).toFixed(2),
            // (entity.runnerUps / NUM_SIMULATIONS * 100).toFixed(2),
            // (entity.championships / NUM_SIMULATIONS * 100).toFixed(2),
        ]);
    });

    console.log(table(resultsList));
    // console.log(JSON.stringify(teamsCopy, null, 2));
    // console.log('Wins for the 4 seed', JSON.stringify(fourthSeedWins, null, 2));
    // console.log('Wins for the 5 seed', JSON.stringify(fifthSeedWins, null, 2));

    const probabilityMap: Record<string, number> = sortedTeamList.reduce((acc, curr) => {
        acc[curr.name] = (statsToAnalyze[curr.name].playoffAppearances / NUM_SIMULATIONS * 100);
        return acc;
    }, {});

    return probabilityMap;
};

const runWeeklyGameLeverages = (schedule: IGame[], teams: Record<string, ITeamData>) => {
    console.log('beginning baseline simulation');
    const baseProbabilityMap = runSimulations(schedule, teams);
    console.log('Done with baseline simulation');
    weeklyGameLeverages({ week: currentWeek, baseProbabilityMap, schedule, teams });
};

const weeklyGameLeverages = (params: {
    week: number;
    baseProbabilityMap: Record<string, number>;
    schedule: IGame[];
    teams: Record<string, ITeamData>;
}) => {
    const { week, baseProbabilityMap, schedule, teams } = params;

    const gamesToAnalyze = schedule.filter((game) => game.week === week);

    const resultsList = [[
        'Name',
        'Base Probability'
    ], [
        '',
        '',
    ]];

    Object.keys(baseProbabilityMap).forEach((name) => {
        resultsList.push([
            name,
            baseProbabilityMap[name].toFixed(2),
        ]);
    });

    gamesToAnalyze.forEach((game) => {
        // new schedule without the game in question
        const newSchedule = _.cloneDeep(schedule).filter((filterGame) => !(filterGame.home === game.home && filterGame.away === game.away && filterGame.week === game.week));
        // console.log(newSchedule);

        const newProbabilityMaps: Record<string, number>[] = [];

        ['home', 'away'].forEach((winner) => {
            const teamsCopy = _.cloneDeep(teams);
            if (winner === 'home') {
                teamsCopy[game.home].wins++;
                teamsCopy[game.away].losses++;
                if (!teamsCopy[game.home].records[game.away]) {
                    teamsCopy[game.home].records[game.away] = 0;
                }
                teamsCopy[game.home].records[game.away]++;
            } else {
                teamsCopy[game.away].wins++;
                teamsCopy[game.home].losses++;
                if (!teamsCopy[game.away].records[game.home]) {
                    teamsCopy[game.away].records[game.home] = 0;
                }
                teamsCopy[game.away].records[game.home]++;
            }

            // console.log(JSON.stringify(teamsCopy, null, 2));

            // console.log(`Running simulation where ${winner === 'home' ? game.home : game.away} wins ${game.home} vs. ${game.away} in week ${week}`);
            const newProbabilityMap = runSimulations(newSchedule, teamsCopy);

            newProbabilityMaps.push(newProbabilityMap);
        });

        resultsList[0].push(`${game.home} win`, `${game.away} win`);

        const homeWinProbability = calculatePythagoreanExpectation(teams[game.home].projectedFuturePPG, teams[game.away].projectedFuturePPG);
        resultsList[1].push(`${(homeWinProbability * 100).toFixed(2)}%`, `${((1 - homeWinProbability) * 100).toFixed(2)}%`);

        Object.keys(baseProbabilityMap).forEach((name, index) => {
            resultsList[index + 2].push(
                `${(newProbabilityMaps[0][name] - baseProbabilityMap[name]).toFixed(2)}%`,
                `${(newProbabilityMaps[1][name] - baseProbabilityMap[name]).toFixed(2)}%`,
            );
        });
        console.log(`Done with simulation of ${game.home} vs. ${game.away} in week ${week}`);
    });

    // console.log(JSON.stringify(resultsList, null, 2));
    console.log(table(resultsList));
};

const determineEveryPossibleOutcome = (params: {
    schedule: IGame[];
    teams: Record<string, ITeamData>;
}) => {
    const scheduleCopy = _.cloneDeep(schedule);
    const teamsCopy = _.cloneDeep(teams);
    // For just my games
    const name = 'Jake';
    // determine who makes the playoffs in every individual scenario + the odds of that scenario

    // all potential outcomes for my games
    let outcomes: string[][] = [];
    const myGames = schedule.filter((filterGame) => filterGame.home === name || filterGame.away === name);
    myGames.forEach(() => {
        const results = ['win', 'lose'];
        if (outcomes.length === 0) {
            outcomes.push([results[0]], [results[1]]);
        } else {
            outcomes = _.flatMap(outcomes, (outcome) => {
                return [outcome.concat(results[0]), outcome.concat(results[1])];
            });
        }
    });
    // probability of home team winning each game
    const myGamesHomeWinProbability: number[] = myGames.map((game) => calculatePythagoreanExpectation(teamsCopy[game.home].projectedFuturePPG, teamsCopy[game.away].projectedFuturePPG));

    let resultsList = [[
        'Outcome',
        'Wins',
        'Losses',
        'Probability',
        'Playoff Probability'
    ]];

    const data: any[] = [];

    // for each set of outcomes, simulate the season
    outcomes.forEach((outcomeSet, index) => {
        const oddsOfScenario = outcomeSet.reduce((acc: number, outcome: string, index: number) => {
            const currentGame = myGames[index];
            const homeTeamWinProb = myGamesHomeWinProbability[index];
            if (currentGame.home === name) {
                return acc * (outcome === 'win' ? homeTeamWinProb : (1 - homeTeamWinProb));
            } else {
                // current person is the away team
                return acc * (outcome === 'win' ? (1 - homeTeamWinProb) : homeTeamWinProb );
            }
        }, 1);
        console.log(outcomeSet, oddsOfScenario.toFixed(2));

        // simulate playoffs in each scenario and determine odds then

        // updated schedule and teams for this scenario
        const newSchedule = _.cloneDeep(scheduleCopy).filter((filterGame) => filterGame.home !== name && filterGame.away !== name);
        const newTeams = _.cloneDeep(teamsCopy);
        myGames.forEach((game, index) => {
            // set the winners and losers of all of my games
            const outcome = outcomeSet[index];
            let opponentName;
            if (game.home === name) {
                opponentName = game.away;
            } else {
                opponentName = game.home;
            }
            if (outcome === 'win') {
                newTeams[name].wins++;
                if (!newTeams[name].records[opponentName]) {
                    newTeams[name].records[opponentName] = 0;
                }
                newTeams[name].records[opponentName]++;
                newTeams[opponentName].losses++;
            } else {
                newTeams[opponentName].wins++;
                if (!newTeams[opponentName].records[name]) {
                    newTeams[opponentName].records[name] = 0;
                }
                newTeams[opponentName].records[name]++;
                newTeams[name].losses++;
            }
        });

        const simulationResults = runSimulations(newSchedule, newTeams);
        console.log(`Completed outcome set ${index + 1} of ${outcomes.length}`);

        data.push([
            outcomeSet.join(', '),
            outcomeSet.filter(a => a === 'win').length,
            outcomeSet.filter(a => a === 'lose').length,
            `${(oddsOfScenario * 100).toFixed(2)}%`,
            `${simulationResults[name].toFixed(2)}%`,
        ]);
    });

    resultsList = resultsList.concat(data.sort((a, b) => Number(a[1]) > Number(b[1]) ? -1 : 1));

    console.log(table(resultsList));
};

// determineExpectedWins();
// runIndividualSimulation(schedule, teams);
runSimulations(schedule, teams);
// runWeeklyGameLeverages(schedule, teams);
// determineEveryPossibleOutcome({ schedule, teams });
