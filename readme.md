# @rbxts/path

A TypeScript wrapper for Roblox's [PathfindingService](https://create.roblox.com/docs/reference/engine/classes/PathfindingService) with async/await support, robust error handling, and a built-in Finite State Machine (FSM) for advanced path state management. Includes utilities for pathfinding, waypoint manipulation, and a `SmartPath` class with automatic retry and recovery.

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
const path = new Path();

async function computePath() {
	const status = await path.computeAsync(startPos, endPos);

	if (status === PathStatus.Success) {
		const waypoints = path.getWaypoints();
		if (!waypoints || waypoints.size() === 0) {
			print("No waypoints found in the computed path.");
			return;
		}
		for (const waypoint of waypoints) {
			const targetPos = waypoint.position;
			humanoid.MoveTo(targetPos);

			const moveStatus = await new Promise<boolean>((resolve) => {
				const connection = humanoid.MoveToFinished.Connect((reached) => {
					connection.Disconnect();
					resolve(reached);
				});
			});
			if (!moveStatus) {
				print(`Failed to move to waypoint at ${targetPos}`);
				return;
			}
		}
	}

	path.destroy();
}

computePath();
```

### Using the Finite State Machine

```ts
import { Path, PathState, PathStatus } from "@rbxts/path";

const path = new Path(
	{},
	{
		onStateChanged: (oldState, newState) => print(`State changed: ${oldState} → ${newState}`),
		onWaypointReached: (waypoint, index) => print(`Reached waypoint ${index}`),
		onPathCompleted: () => print("Path completed successfully!"),
		onPathFailed: (reason) => warn(`Path failed: ${reason}`),
		onPathBlocked: () => warn("Path blocked!"),
	},
);

async function computePathWithFSM() {
	const status = await path.computeAsync(startPos, endPos);

	if (status === PathStatus.Success) {
		path.startFollowing(humanoid);

		while (path.getState() === PathState.Following) {
			task.wait(0.1);
		}

		const finalState = path.getState();
		if (finalState === PathState.Completed) {
			print("Successfully reached destination!");
		} else if (finalState === PathState.Failed) {
			print("Path following failed");
		} else if (finalState === PathState.Blocked) {
			print("Path was blocked");
		}
	}

	path.destroy();
}

async function advancedExample() {
	await path.computeAsync(startPos, endPos);

	if (path.isSuccess()) {
		path.startFollowing(humanoid);

		task.wait(3);
		path.pause();
		print(`Paused - State: ${path.getState()}`);

		task.wait(2);
		path.resume(humanoid);
		print(`Resumed - State: ${path.getState()}`);
	}
}

computePathWithFSM();
```

### SmartPath: Automatic Retry

```ts
import { SmartPath, PathStatus } from "@rbxts/path";

async function smartPathExample() {
	const smartPath = new SmartPath(
		{},
		{},
		{
			maxRetries: 5,
			retryDelay: 1,
			useExponentialBackoff: true,
		},
	);

	const status = await smartPath.computeAsync(startPos, endPos);

	if (status === PathStatus.Success) {
		smartPath.startFollowing(humanoid);
		print("SmartPath started - will auto-retry if blocked!");
	} else {
		print(`Initial path computation failed: ${status}`);
	}
}

smartPathExample();
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

MIT

## Contributions

Contributions are welcome (and encouraged)! Please feel free to submit a Pull Request. I am newer to rbxts package creation and would appreciate all recommendations!
