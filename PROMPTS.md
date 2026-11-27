# Project Prompts

Chronological log of all user prompts used to build **NextBus SG**.

## Prompt 1 — Initial Frontend Application
```text
1. build me a singapore based bus application that tracks real time bus arrivals time and includes search bar to input bus stop code for quick access to arrival data and favorites functionality. 
2. build just the front end for now, I will establish an api connection later.
```

## Prompt 2 — LTA DataMall Serverless Endpoints
```text
1. add a serverless connection that pulls data from LTA's data mall using the following end points: 

2. # Next buses at a stop (v3, the current version; refreshes every 20 seconds):
https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121
# To ask about one service only, add &ServiceNo=7


# Every request needs the header:  AccountKey: <LTA_ACCOUNT_KEY>
2. store this in /api at project root level (not the src file)
3. include a /health.ts and /busarrival.ts within the same subfolder
4. Do not hardcode any key, I will input them manually
```

## Prompt 3 — Browser Pattern Error Fix
```text
The string did not match the expected pattern. appears rework pls
```

## Prompt 4 — Vercel `esbuild` Dependency Conflict Fix
```text
10:19:18.414 Running build in Washington, D.C., USA (East) – iad1
10:19:18.415 Build machine configuration: 2 cores, 8 GB
10:19:18.547 Cloning github.com/lightezz/SG-Bus (Branch: main, Commit: 92ee6ab)
10:19:18.549 Previous build caches not available.
10:19:18.862 Cloning completed: 315.000ms
10:19:20.075 Running "vercel build"
10:19:20.088 Vercel CLI 66.6.0
10:19:21.040 Installing dependencies...
10:19:21.913 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
10:19:34.232 npm error code ERESOLVE
10:19:34.233 npm error ERESOLVE could not resolve
10:19:34.233 npm error
10:19:34.234 npm error Found: esbuild@0.25.12
10:19:34.234 npm error node_modules/esbuild
10:19:34.234 npm error   dev esbuild@"^0.25.0" from the root project
10:19:34.234 npm error
10:19:34.234 npm error Could not resolve dependency:
10:19:34.235 npm error peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.4.0
10:19:34.235 npm error node_modules/vite
10:19:34.235 npm error   vite@"^8.3.0" from the root project
10:19:34.235 npm error   peer vite@"^5.2.0 || ^6 || ^7 || ^8" from @tailwindcss/vite@4.3.5
10:19:34.236 npm error     node_modules/@tailwindcss/vite
10:19:34.236 npm error       @tailwindcss/vite@"^4.3.3" from the root project
10:19:34.236 npm error   1 more (@vitejs/plugin-react)
10:19:34.236 npm error
10:19:34.236 npm error Conflicting peer dependency: esbuild@0.28.2
10:19:34.236 npm error node_modules/tsx/node_modules/esbuild
10:19:34.237 npm error   peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.4.0
10:19:34.237 npm error   node_modules/vite
10:19:34.237 npm error     vite@"^8.3.0" from the root project
10:19:34.237 npm error     peer vite@"^5.2.0 || ^6 || ^7 || ^8" from @tailwindcss/vite@4.3.5
10:19:34.238 npm error       node_modules/@tailwindcss/vite
10:19:34.238 npm error         @tailwindcss/vite@"^4.3.3" from the root project
10:19:34.238 npm error     1 more (@vitejs/plugin-react)
10:19:34.239 npm error
10:19:34.239 npm error Fix the upstream dependency conflict, or retry this command with --force or --legacy-peer-deps to accept an incorrect (and potentially broken) dependency resolution.
10:19:34.239 npm error
10:19:34.239 npm error
10:19:34.239 npm error For a full report see:
10:19:34.239 npm error /vercel/.npm/_logs/2026-11-27T02_19_21_363Z-eresolve-report.txt
10:19:34.239 npm error A complete log of this run can be found in: /vercel/.npm/_logs/2026-11-27T02_19_21_363Z-debug-0.log
10:19:34.290 Error: [BUILD_UTILS_SPAWN_1] Command "npm install" exited with 1   fix it
```

## Prompt 5 — Collate Prompts
```text
collate all prompts and store them in PROMPTS.md
```
