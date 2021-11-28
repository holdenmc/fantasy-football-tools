import request from 'superagent';
import fs from 'fs';
import path from 'path';

// ts-node src/scripts/generateTeamSchedule.ts

/**
 * generate team map - Record<string, ITeamData>
 */

/**
 * generate schedule array { home: string; away: string; week?: number; }[]
 */

// TODO: get this from Fleaflicker API?
const idToName = {
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
};
const leagueId = 183250;
const maxWeeks = 14;

const computeTeams = async () => {
    const teams = {
        Carter: {
            name: 'Carter',
            records: {},
        },
        Kevin: {
            name: 'Kevin',
            records: {},
        },
        Brandon: {
            name: 'Brandon',
            records: {},
        },
        Holden: {
            name: 'Holden',
            records: {},
        },
        Jake: {
            name: 'Jake',
            records: {},
        },
        Chris: {
            name: 'Chris',
            records: {},
        },
        Mike: {
            name: 'Mike',
            records: {},
        },
        Zach: {
            name: 'Zach',
            records: {},
        },
        Jeremy: {
            name: 'Jeremy',
            records: {},
        },
        Paul: {
            name: 'Paul',
            records: {},
        },
    };

    const leagueStandings: any = await request
        .get('https://www.fleaflicker.com/api/FetchLeagueStandings')
        .query({ leagueId })
        .send();

    // console.log(leagueStandings.body);

    const divisions = leagueStandings.body.divisions;
    divisions.forEach((division) => {
        const divisionName = division.name;
        division.teams.forEach((team) => {
            const teamId = team.id;
            const nameKey = idToName[teamId];

            teams[nameKey].wins = team.recordOverall.wins ?? 0;
            teams[nameKey].losses = team.recordOverall.losses ?? 0;
            teams[nameKey].division = divisionName;
            teams[nameKey].totalPoints = team.pointsFor.value;
        });
    });

    const currentWeekScoreboard: any = await request
        .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
        .query({ leagueId })
        .send();

    const currentWeek = currentWeekScoreboard.body.schedulePeriod.value;
    const schedulingPeriodsToQuery = [...Array(currentWeek).keys()].slice(1);

    const requestPromises = schedulingPeriodsToQuery.map((scoring_period) => request
        .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
        .query({ leagueId, scoring_period })
        .send()
    );

    const results: any[] = await Promise.all(requestPromises);

    results.forEach((scoreboard) => {
        scoreboard.body.games.forEach((game) => {
            const isHomeWinner = game.homeResult === 'WIN';
            const homeTeamName = idToName[game.home.id];
            const awayTeamName = idToName[game.away.id];

            if (isHomeWinner) {
                if (!teams[homeTeamName].records[awayTeamName]) {
                    teams[homeTeamName].records[awayTeamName] = 0;
                }
                teams[homeTeamName].records[awayTeamName]++;
            } else {
                if (!teams[awayTeamName].records[homeTeamName]) {
                    teams[awayTeamName].records[homeTeamName] = 0;
                }
                teams[awayTeamName].records[homeTeamName]++;
            }
        });
    });

    // console.log(JSON.stringify(teams, null, 4));
    return teams;
};

const computeSchedules = async () => {
    const schedule: { home: string; away: string; week: number; }[] = [];

    // note: always get current week's scoreboard
    const currentWeekScoreboard: any = await request
        .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
        .query({ leagueId })
        .send();

    const currentWeek = currentWeekScoreboard.body.schedulePeriod.value;
    const isCurrentWeekComplete = currentWeekScoreboard.body.games[0].isFinalScore;
    console.log('isCurrentWeekComplete', isCurrentWeekComplete);

    // numbers from currentWeek + 1 to end of season
    const schedulingPeriodsToQuery = [...Array(maxWeeks + 1).keys()].slice(currentWeek + 1);

    const requestPromises = schedulingPeriodsToQuery.map((scoring_period) => request
        .get('https://www.fleaflicker.com/api/FetchLeagueScoreboard')
        .query({ leagueId, scoring_period })
        .send()
    );

    const results = await Promise.all(requestPromises);

    [...(isCurrentWeekComplete ? [] : [currentWeekScoreboard]), ...results].forEach((scoreboard) => {
        scoreboard.body.games.forEach((game) => {
            schedule.push({ home: idToName[game.home.id], away: idToName[game.away.id], week: scoreboard.body.schedulePeriod.value });
        });
    });

    // console.log(JSON.stringify(schedule, null, 4));
    return schedule;
};

const computeAndWriteToFile = async () => {
    const fileData = {
        teams: await computeTeams(),
        schedule: await computeSchedules(),
    };
    const currentWeek = fileData.schedule[0].week;
    const filePath = path.join(__dirname, `../data/teamSchedules/2021-${currentWeek}.json`);
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
};

computeAndWriteToFile();
