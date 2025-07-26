// Types and interfaces for the pathfinding system

export interface PathOptions {
	agentRadius?: number; // default: 2
	agentHeight?: number; // default: 5
	agentCanJump?: boolean; // default: true
	agentCanClimb?: boolean; // default: true
	maxDistance?: number; // default: math.huge
	modifiers?: { [material: string]: number }; // default: {}
}

export enum PathState {
	Idle = "Idle",
	Computing = "Computing",
	Following = "Following",
	Blocked = "Blocked",
	Completed = "Completed",
	Failed = "Failed",
	Paused = "Paused",
}

export enum PathStatus {
	Success = "Success",
	ClosestNoPath = "ClosestNoPath",
	ClosestOutOfRange = "ClosestOutOfRange",
	FailStartNotEmpty = "FailStartNotEmpty",
	FailFinishNotEmpty = "FailFinishNotEmpty",
	NoPath = "NoPath",
}

export interface Waypoint {
	position: Vector3;
	action: Enum.PathWaypointAction;
}

export interface PathFSMEvents {
	onStateChanged?: (oldState: PathState, newState: PathState) => void;
	onWaypointReached?: (waypoint: Waypoint, index: number) => void;
	onPathCompleted?: () => void;
	onPathFailed?: (reason: PathStatus) => void;
	onPathBlocked?: () => void;
}
