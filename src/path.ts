/**
 * A TypeScript wrapper for Roblox's PathfindingService with FSM support
 * Provides async/await support, better error handling, and state management
 */

import { PathfindingService, RunService } from "@rbxts/services";
import { PathFSM } from "./state";
import { PathOptions, PathState, PathStatus, Waypoint, PathFSMEvents } from "./types";

type RobloxPath = ReturnType<typeof PathfindingService.CreatePath>;

export class Path {
	private robloxPath: RobloxPath;
	private readonly options: Required<PathOptions>;
	private readonly fsm: PathFSM;
	private currentWaypoints: Waypoint[] = [];
	private currentWaypointIndex: number = 0;
	private blockCheckConnection?: RBXScriptConnection;
	private followConnection?: RBXScriptConnection;
	private pathBlockedConnection?: RBXScriptConnection;

	constructor(options: PathOptions = {}, fsmEvents: PathFSMEvents = {}) {
		this.options = this.normalizeOptions(options);
		this.robloxPath = this.createRobloxPath();
		this.fsm = new PathFSM(fsmEvents);
		this.setupPathBlockedListener();
	}

	private normalizeOptions(options: PathOptions): Required<PathOptions> {
		return {
			agentRadius: options.agentRadius ?? 2,
			agentHeight: options.agentHeight ?? 5,
			agentCanJump: options.agentCanJump ?? true,
			agentCanClimb: options.agentCanClimb ?? false,
			maxDistance: options.maxDistance ?? math.huge,
			modifiers: options.modifiers ?? {},
		};
	}

	private createRobloxPath(): RobloxPath {
		return PathfindingService.CreatePath({
			AgentRadius: this.options.agentRadius,
			AgentHeight: this.options.agentHeight,
			AgentCanJump: this.options.agentCanJump,
			AgentCanClimb: this.options.agentCanClimb,
			Costs: this.options.modifiers,
		});
	}

	private setupPathBlockedListener(): void {
		this.pathBlockedConnection = this.robloxPath.Blocked.Connect(() => {
			if (this.getState() === PathState.Following) {
				this.fsm.triggerPathBlocked();
			}
		});
	}

	// Gets the current FSM state
	getState(): PathState {
		return this.fsm.getCurrentState();
	}

	// Gets the FSM instance for advanced control
	getFSM(): PathFSM {
		return this.fsm;
	}

	// Gets the path options used for this path
	getOptions(): Required<PathOptions> {
		return { ...this.options };
	}

	/**
	 * Computes a path from start to finish asynchronously with FSM state management
	 * @param start Starting position
	 * @param finish Target position
	 * @returns Promise that resolves with path status
	 */
	async computeAsync(start: Vector3, finish: Vector3): Promise<PathStatus> {
		if (!this.fsm.transitionTo(PathState.Computing)) {
			throw `Cannot compute path in current state: ${this.getState()}`;
		}

		return new Promise<PathStatus>((resolve) => {
			this.robloxPath.ComputeAsync(start, finish);
			const status = this.robloxPath.Status.Name as PathStatus;

			if (status === PathStatus.Success) {
				this.extractWaypoints();
			} else {
				this.fsm.triggerPathFailed(status);
			}

			resolve(status);
		});
	}

	private extractWaypoints(): void {
		const waypoints = this.robloxPath.GetWaypoints();
		this.currentWaypoints = waypoints.map((wp: PathWaypoint) => ({
			position: wp.Position,
			action: wp.Action,
		}));
		this.currentWaypointIndex = 0;
	}

	/**
	 * Start following the computed path with automatic waypoint progression
	 * @param humanoid The humanoid to move
	 * @param waypointReachedDistance Distance threshold for waypoint completion (default: 5)
	 */
	startFollowing(humanoid: Humanoid, waypointReachedDistance: number = 5): void {
		if (this.currentWaypoints.size() === 0) {
			this.fsm.triggerPathFailed(PathStatus.NoPath);
			return;
		}

		if (!this.fsm.transitionTo(PathState.Following)) {
			warn(`Cannot start following in current state: ${this.getState()}`);
			return;
		}

		this.cleanupConnections();
		this.followNextWaypoint(humanoid, waypointReachedDistance);
	}

	// Pauses path following
	pause(): void {
		if (this.fsm.transitionTo(PathState.Paused)) {
			this.cleanupConnections();
		}
	}

	/**
	 * Resumes path following
	 * @param humanoid The humanoid to move
	 * @param waypointReachedDistance Distance threshold for waypoint completion
	 */
	resume(humanoid: Humanoid, waypointReachedDistance: number = 5): void {
		if (this.fsm.transitionTo(PathState.Following)) {
			this.followNextWaypoint(humanoid, waypointReachedDistance);
		}
	}

	// Stops path following and reset to idle
	stop(): void {
		this.cleanupConnections();
		this.fsm.transitionTo(PathState.Idle);
		this.currentWaypointIndex = 0;
	}

	private followNextWaypoint(humanoid: Humanoid, waypointReachedDistance: number): void {
		if (this.currentWaypointIndex >= this.currentWaypoints.size()) {
			this.fsm.triggerPathCompleted();
			this.cleanupConnections();
			return;
		}

		const waypoint = this.currentWaypoints[this.currentWaypointIndex];

		if (waypoint.action === Enum.PathWaypointAction.Jump) {
			humanoid.Jump = true;
		}

		humanoid.MoveTo(waypoint.position);

		this.followConnection = RunService.Heartbeat.Connect(() => {
			const humanoidRootPart = humanoid.RootPart;
			if (!humanoidRootPart) return;

			const distance = humanoidRootPart.Position.sub(waypoint.position).Magnitude;

			if (distance <= waypointReachedDistance) {
				if (this.followConnection) {
					this.followConnection.Disconnect();
					this.followConnection = undefined;
				}

				this.fsm.triggerWaypointReached(waypoint, this.currentWaypointIndex);
				this.currentWaypointIndex++;

				if (this.getState() === PathState.Following) {
					this.followNextWaypoint(humanoid, waypointReachedDistance);
				}
			}
		});
	}

	private cleanupConnections(): void {
		if (this.followConnection) {
			this.followConnection.Disconnect();
			this.followConnection = undefined;
		}
	}

	/**
	 * Gets the waypoints of the computed path
	 * @returns Array of waypoints, or undefined if no path exists
	 */
	getWaypoints(): Waypoint[] | undefined {
		if (this.robloxPath.Status !== Enum.PathStatus.Success) {
			return undefined;
		}
		return [...this.currentWaypoints];
	}

	/**
	 * Gets the total length of the path in studs by calculating distance between waypoints
	 * @returns Path length, or 0 if no path exists
	 */
	getDistance(): number {
		if (this.robloxPath.Status !== Enum.PathStatus.Success || this.currentWaypoints.size() === 0) {
			return 0;
		}

		let totalDistance = 0;
		for (let i = 0; i < this.currentWaypoints.size() - 1; i++) {
			const current = this.currentWaypoints[i].position;
			const nextWaypoint = this.currentWaypoints[i + 1].position;
			totalDistance += current.sub(nextWaypoint).Magnitude;
		}

		return totalDistance;
	}

	// Gets the current status of the path
	getStatus(): PathStatus {
		return this.robloxPath.Status.Name as PathStatus;
	}

	// Checks if the path computation was successful
	isSuccess(): boolean {
		return this.robloxPath.Status === Enum.PathStatus.Success;
	}

	// Gets the current waypoint index
	getCurrentWaypointIndex(): number {
		return this.currentWaypointIndex;
	}

	// Gets the total number of waypoints
	getWaypointCount(): number {
		return this.currentWaypoints.size();
	}

	// Destroys the internal path object and clean up connections
	destroy(): void {
		this.stop();
		if (this.pathBlockedConnection) {
			this.pathBlockedConnection.Disconnect();
			this.pathBlockedConnection = undefined;
		}
		this.robloxPath.Destroy();
	}
}
