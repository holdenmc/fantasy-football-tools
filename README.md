# fantasy-football-tools

Collection of scripts for analyzing a fantasy football league on Fleaflicker

node version: 16.13.0

Technical TODO
- add logging tool with log levels to help with debugging
- add a frontend with React or Vue (or experiment with both)
- mess around with deno
- add a real backend (try fastify?)
- try out some different databases

Feature TODO
- Team value analysis
- 538/NYT-like UI to analyze individual game outcomes (i.e. select a result for a specific game and see how odds change)
- build week-by-week team level projections based on some projections API (ESPN? Sleeper?)
- Historic win-loss records and scoring records

To use
- Update teamFuturePPG in `leagueData.ts` from FBG League Dominator
- Run `generateTeamSchedule` to create a Team Schedule JSON file
- Run `runSimulations` to create a simulation results JSON file and output a table