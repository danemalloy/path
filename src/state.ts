// A simple Finite State Machine for managing pathfinding states

import { PathState, PathStatus, Waypoint, PathFSMEvents } from "./types";

export class PathFSM {
	private currentState: PathState = PathState.Idle;
	private readonly events: PathFSMEvents;
	private readonly validTransitions: Map<PathState, PathState[]>;

	constructor(events: PathFSMEvents = {}) {
		this.events = events;

		// Define valid state transitions
		this.validTransitions = new Map([
			[PathState.Idle, [PathState.Computing]],
			[PathState.Computing, [PathState.Following, PathState.Failed]],
			[
				PathState.Following,
				[PathState.Blocked, PathState.Completed, PathState.Failed, PathState.Paused, PathState.Computing],
			],
			[PathState.Blocked, [PathState.Computing, PathState.Failed, PathState.Following]],
			[PathState.Paused, [PathState.Following, PathState.Computing, PathState.Failed]],
			[PathState.Completed, [PathState.Idle, PathState.Computing]],
			[PathState.Failed, [PathState.Idle, PathState.Computing]],
		]);
	}

	getCurrentState(): PathState {
		return this.currentState;
	}

	canTransitionTo(newState: PathState): boolean {
		const validStates = this.validTransitions.get(this.currentState);
		return validStates ? validStates.includes(newState) : false;
	}

	transitionTo(newState: PathState): boolean {
		if (!this.canTransitionTo(newState)) {
			warn(`Invalid state transition from ${this.currentState} to ${newState}`);
			return false;
		}

		const oldState = this.currentState;
		this.currentState = newState;

		if (this.events.onStateChanged) {
			this.events.onStateChanged(oldState, newState);
		}

		return true;
	}

	triggerWaypointReached(waypoint: Waypoint, index: number): void {
		if (this.events.onWaypointReached) {
			this.events.onWaypointReached(waypoint, index);
		}
	}

	triggerPathCompleted(): void {
		this.transitionTo(PathState.Completed);
		if (this.events.onPathCompleted) {
			this.events.onPathCompleted();
		}
	}

	triggerPathFailed(reason: PathStatus): void {
		this.transitionTo(PathState.Failed);
		if (this.events.onPathFailed) {
			this.events.onPathFailed(reason);
		}
	}

	triggerPathBlocked(): void {
		this.transitionTo(PathState.Blocked);
		if (this.events.onPathBlocked) {
			this.events.onPathBlocked();
		}
	}

	reset(): void {
		this.currentState = PathState.Idle;
	}

	// Gets all valid states that can be transitioned to from the current state
	getValidTransitions(): PathState[] {
		return this.validTransitions.get(this.currentState) || [];
	}

	//Checks if the FSM is in a terminal state (Completed or Failed)
	isTerminalState(): boolean {
		return this.currentState === PathState.Completed || this.currentState === PathState.Failed;
	}

	// Checks if the FSM is in an active state (Computing or Following)
	isActiveState(): boolean {
		return this.currentState === PathState.Computing || this.currentState === PathState.Following;
	}
}
