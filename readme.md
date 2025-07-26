# @rbxts/path

A TypeScript-first wrapper for Roblox's [PathfindingService](https://create.roblox.com/docs/reference/engine/classes/PathfindingService) with async/await support, robust error handling, and a built-in Finite State Machine (FSM) for advanced path state management. Includes utilities for pathfinding, waypoint manipulation, and a `SmartPath` class with automatic retry and recovery.

## Features

- **Async/await** path computation
- **Finite State Machine** for path state transitions and events
- **SmartPath**: automatic retry and recovery on failure/blockage
- **Utility functions** for distance, waypoints, and performance estimation
- **TypeScript types** for all core concepts

## Installation

```sh
npm i @rbxts/path
```

## Usage

### Basic Pathfinding

```ts
import { Path, PathStatus } from "@rbxts/path";

const path = new Path();
const status = await path.computeAsync(startPosition, endPosition);

if (status === PathStatus.Success) {
	const waypoints = path.getWaypoints();
	// Move your humanoid along the waypoints...
}

path.destroy();
```

### Using the Finite State Machine

```ts
import { Path, PathState } from "@rbxts/path";

const path = new Path(
	{},
	{
		onStateChanged: (oldState, newState) => print(`State changed: ${oldState} -> ${newState}`),
		onWaypointReached: (waypoint, index) => print(`Reached waypoint ${index}`),
		onPathCompleted: () => print("Path completed!"),
		onPathFailed: (reason) => print(`Path failed: ${reason}`),
		onPathBlocked: () => print("Path blocked!"),
	},
);

await path.computeAsync(start, finish);
path.startFollowing(humanoid);
```

### SmartPath: Automatic Retry

```ts
import { SmartPath } from "@rbxts/path";

const smartPath = new SmartPath({}, {}, { maxRetries: 5 });
await smartPath.computeAsync(start, finish);
smartPath.startFollowing(humanoid);
```

### Utilities

```ts
import { PathfindingUtils } from "@rbxts/path";

const exists = await PathfindingUtils.pathExists(start, finish);
const distance = await PathfindingUtils.getPathDistance(start, finish);
const waypoints = await PathfindingUtils.getWaypoints(start, finish);
```

## API Reference

- [`Path`](src/path.ts): Main pathfinding class
- [`SmartPath`](src/smartpath.ts): Path with retry/recovery
- [`PathFSM`](src/state.ts): Finite State Machine for path states
- [`PathfindingUtils`](src/utils.ts): Utility functions
- [Types & Enums](src/types.ts): `PathOptions`, `PathState`, `PathStatus`, `Waypoint`, etc.

## License

ISC
