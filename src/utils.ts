// Utility class for pathfinding operations

import { Path } from "./path";
import { SmartPath } from "./smartpath";
import { PathOptions, Waypoint } from "./types";

export class PathfindingUtils {
	/**
	 * Creates a simple path from start to finish with default options
	 * @param start Starting position
	 * @param finish Target position
	 * @param options Optional pathfinding options
	 * @returns Promise that resolves with the computed path
	 */
	static async createPath(start: Vector3, finish: Vector3, options?: PathOptions): Promise<Path> {
		const path = new Path(options);
		await path.computeAsync(start, finish);
		return path;
	}

	/**
	 * Creates a SmartPath with retry capabilities
	 * @param start Starting position
	 * @param finish Target position
	 * @param options Optional pathfinding options
	 * @param maxRetries Maximum retry attempts
	 * @returns Promise that resolves with the computed smart path
	 */
	static async createSmartPath(
		start: Vector3,
		finish: Vector3,
		options?: PathOptions,
		maxRetries: number = 3,
	): Promise<SmartPath> {
		const path = new SmartPath(options, {}, { maxRetries });
		await path.computeAsync(start, finish);
		return path;
	}

	/**
	 * Gets a simple waypoint path between two points
	 * @param start Starting position
	 * @param finish Target position
	 * @param options Optional pathfinding options
	 * @returns Promise that resolves with waypoints array or undefined
	 */
	static async getWaypoints(start: Vector3, finish: Vector3, options?: PathOptions): Promise<Waypoint[] | undefined> {
		const path = await this.createPath(start, finish, options);
		const waypoints = path.getWaypoints();
		path.destroy();
		return waypoints;
	}

	/**
	 * Calculates the distance of a path between two points
	 * @param start Starting position
	 * @param finish Target position
	 * @param options Optional pathfinding options
	 * @returns Promise that resolves with path distance
	 */
	static async getPathDistance(start: Vector3, finish: Vector3, options?: PathOptions): Promise<number> {
		const path = await this.createPath(start, finish, options);
		const distance = path.getDistance();
		path.destroy();
		return distance;
	}

	/**
	 * Checks if a path exists between two points
	 * @param start Starting position
	 * @param finish Target position
	 * @param options Optional pathfinding options
	 * @returns Promise that resolves to true if path exists
	 */
	static async pathExists(start: Vector3, finish: Vector3, options?: PathOptions): Promise<boolean> {
		const path = new Path(options);
		const status = await path.computeAsync(start, finish);
		const exists = path.isSuccess();
		path.destroy();
		return exists;
	}

	/**
	 * Gets the straight-line distance between two points
	 * @param start Starting position
	 * @param finish Target position
	 * @returns Distance in studs
	 */
	static getStraightLineDistance(start: Vector3, finish: Vector3): number {
		return start.sub(finish).Magnitude;
	}

	/**
	 * Estimates if pathfinding is needed based on straight-line distance
	 * @param start Starting position
	 * @param finish Target position
	 * @param threshold Distance threshold below which pathfinding might not be needed
	 * @returns True if pathfinding is recommended
	 */
	static shouldUsePathfinding(start: Vector3, finish: Vector3, threshold: number = 50): boolean {
		return this.getStraightLineDistance(start, finish) > threshold;
	}

	/**
	 * Filters waypoints to reduce the total count (useful for performance)
	 * @param waypoints Original waypoints array
	 * @param maxWaypoints Maximum number of waypoints to keep
	 * @returns Filtered waypoints array
	 */
	static filterWaypoints(waypoints: Waypoint[], maxWaypoints: number): Waypoint[] {
		if (waypoints.size() <= maxWaypoints) {
			return waypoints;
		}

		const filtered: Waypoint[] = [];
		const step = (waypoints.size() - 1) / (maxWaypoints - 1);

		filtered.push(waypoints[0]);

		for (let i = 1; i < maxWaypoints - 1; i++) {
			const index = math.floor(i * step);
			filtered.push(waypoints[index]);
		}

		filtered.push(waypoints[waypoints.size() - 1]);

		return filtered;
	}

	/**
	 * Calculates the total distance of a waypoint path
	 * @param waypoints Array of waypoints
	 * @returns Total distance in studs
	 */
	static calculateWaypointDistance(waypoints: Waypoint[]): number {
		if (waypoints.size() < 2) return 0;

		let totalDistance = 0;
		for (let i = 1; i < waypoints.size(); i++) {
			const distance = waypoints[i - 1].position.sub(waypoints[i].position).Magnitude;
			totalDistance += distance;
		}

		return totalDistance;
	}

	/**
	 * Finds waypoints that require jumping
	 * @param waypoints Array of waypoints
	 * @returns Array of waypoint indices that require jumping
	 */
	static findJumpWaypoints(waypoints: Waypoint[]): number[] {
		const jumpIndices: number[] = [];

		for (let i = 0; i < waypoints.size(); i++) {
			if (waypoints[i].action === Enum.PathWaypointAction.Jump) {
				jumpIndices.push(i);
			}
		}

		return jumpIndices;
	}

	/**
	 * Checks if two positions are approximately equal within a tolerance
	 * @param pos1 First position
	 * @param pos2 Second position
	 * @param tolerance Distance tolerance (default: 1)
	 * @returns True if positions are approximately equal
	 */
	static positionsEqual(pos1: Vector3, pos2: Vector3, tolerance: number = 1): boolean {
		return pos1.sub(pos2).Magnitude <= tolerance;
	}

	/**
	 * Gets the midpoint between two positions
	 * @param start Starting position
	 * @param finish Target position
	 * @returns Midpoint Vector3
	 */
	static getMidpoint(start: Vector3, finish: Vector3): Vector3 {
		return start.add(finish).div(2);
	}

	/**
	 * Interpolates between two positions by a given factor
	 * @param start Starting position
	 * @param finish Target position
	 * @param alpha Interpolation factor (0-1)
	 * @returns Interpolated position
	 */
	static lerp(start: Vector3, finish: Vector3, alpha: number): Vector3 {
		return start.Lerp(finish, alpha);
	}

	/**
	 * Gets the direction vector from start to finish (normalized)
	 * @param start Starting position
	 * @param finish Target position
	 * @returns Normalized direction vector
	 */
	static getDirection(start: Vector3, finish: Vector3): Vector3 {
		return finish.sub(start).Unit;
	}

	/**
	 * Finds the closest waypoint to a given position
	 * @param position Target position
	 * @param waypoints Array of waypoints to search
	 * @returns Index of closest waypoint, or -1 if no waypoints
	 */
	static findClosestWaypoint(position: Vector3, waypoints: Waypoint[]): number {
		if (waypoints.size() === 0) return -1;

		let closestIndex = 0;
		let closestDistance = position.sub(waypoints[0].position).Magnitude;

		for (let i = 1; i < waypoints.size(); i++) {
			const distance = position.sub(waypoints[i].position).Magnitude;
			if (distance < closestDistance) {
				closestDistance = distance;
				closestIndex = i;
			}
		}

		return closestIndex;
	}

	/**
	 * Simplifies a path by removing unnecessary waypoints that are roughly in a straight line
	 * @param waypoints Original waypoints array
	 * @param tolerance Angular tolerance in degrees (default: 10)
	 * @returns Simplified waypoints array
	 */
	static simplifyPath(waypoints: Waypoint[], tolerance: number = 10): Waypoint[] {
		if (waypoints.size() <= 2) return waypoints;

		const simplified: Waypoint[] = [waypoints[0]];
		const toleranceRad = math.rad(tolerance);

		for (let i = 1; i < waypoints.size() - 1; i++) {
			const prev = waypoints[i - 1].position;
			const current = waypoints[i].position;
			const nextWaypoint = waypoints[i + 1].position;

			const dir1 = current.sub(prev).Unit;
			const dir2 = nextWaypoint.sub(current).Unit;

			const dot = dir1.Dot(dir2);
			const angle = math.acos(math.clamp(dot, -1, 1));

			if (angle > toleranceRad || waypoints[i].action !== Enum.PathWaypointAction.Walk) {
				simplified.push(waypoints[i]);
			}
		}

		simplified.push(waypoints[waypoints.size() - 1]);
		return simplified;
	}

	/**
	 * Checks if a straight line path is clear between two points using raycasting
	 * @param start Starting position
	 * @param finish Target position
	 * @param ignoreList Optional list of instances to ignore during raycasting
	 * @returns True if path is clear
	 */
	static isLineOfSightClear(start: Vector3, finish: Vector3, ignoreList?: Instance[]): boolean {
		const workspace = game.GetService("Workspace");
		const direction = finish.sub(start);

		const raycastParams = new RaycastParams();
		if (ignoreList) {
			raycastParams.FilterDescendantsInstances = ignoreList;
			raycastParams.FilterType = Enum.RaycastFilterType.Blacklist;
		}

		const result = workspace.Raycast(start, direction, raycastParams);
		return result === undefined;
	}

	/**
	 * Validates pathfinding options and provides default values
	 * @param options Input options to validate
	 * @returns Validated PathOptions with defaults applied
	 */
	static validateOptions(options?: PathOptions): Required<PathOptions> {
		return {
			agentRadius: options?.agentRadius ?? 2,
			agentHeight: options?.agentHeight ?? 5,
			agentCanJump: options?.agentCanJump ?? true,
			agentCanClimb: options?.agentCanClimb ?? false,
			maxDistance: options?.maxDistance ?? math.huge,
			modifiers: options?.modifiers ?? {},
		};
	}

	/**
	 * Estimates pathfinding performance impact based on distance and options
	 * @param start Starting position
	 * @param finish Target position
	 * @param options Pathfinding options
	 * @returns Performance impact estimate ("low", "medium", "high")
	 */
	static estimatePerformanceImpact(
		start: Vector3,
		finish: Vector3,
		options?: PathOptions,
	): "low" | "medium" | "high" {
		const distance = this.getStraightLineDistance(start, finish);
		const validatedOptions = this.validateOptions(options);

		let impact = 0;
		if (distance > 500) impact += 2;
		else if (distance > 200) impact += 1;

		if (validatedOptions.maxDistance !== math.huge && validatedOptions.maxDistance > 1000) {
			impact += 1;
		}

		if (validatedOptions.agentCanClimb) impact += 1;
		if (validatedOptions.agentRadius > 5) impact += 1;

		if (validatedOptions.modifiers && next(validatedOptions.modifiers)[0] !== undefined) {
			let modifierCount = 0;
			for (const [key, value] of pairs(validatedOptions.modifiers)) {
				modifierCount++;
				if (modifierCount > 5) {
					impact += 1;
					break;
				}
			}
		}

		if (impact >= 4) return "high";
		if (impact >= 2) return "medium";
		return "low";
	}
}
