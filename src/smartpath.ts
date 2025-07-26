import { Path } from "./path";
import { PathOptions, PathStatus, PathFSMEvents } from "./types";

// Configuration options for SmartPath retry behavior
export interface SmartPathOptions {
	maxRetries?: number; // default: 3
	retryDelay?: number; // default: 1
	useExponentialBackoff?: boolean; // default: true
	shouldRetry?: (reason: PathStatus, attempt: number) => boolean; // return true if the error should trigger a retry
}

// Advanced Path class with automatic retry and recovery mechanisms
export class SmartPath extends Path {
	private retryAttempts: number = 0;
	private readonly smartOptions: Required<SmartPathOptions>;
	private lastStart?: Vector3;
	private lastFinish?: Vector3;
	private currentHumanoid?: Humanoid;
	private currentWaypointDistance?: number;

	constructor(pathOptions: PathOptions = {}, fsmEvents: PathFSMEvents = {}, smartOptions: SmartPathOptions = {}) {
		const enhancedEvents: PathFSMEvents = {
			...fsmEvents,
			onPathBlocked: () => {
				fsmEvents.onPathBlocked?.();
				this.handleBlocked();
			},
			onPathFailed: (reason) => {
				fsmEvents.onPathFailed?.(reason);
				this.handleFailure(reason);
			},
		};

		super(pathOptions, enhancedEvents);
		this.smartOptions = this.normalizeSmartOptions(smartOptions);
	}

	private normalizeSmartOptions(options: SmartPathOptions): Required<SmartPathOptions> {
		return {
			maxRetries: options.maxRetries ?? 3,
			retryDelay: options.retryDelay ?? 1,
			useExponentialBackoff: options.useExponentialBackoff ?? true,
			shouldRetry:
				options.shouldRetry ??
				((reason: PathStatus, attempt: number) => this.defaultShouldRetry(reason, attempt)),
		};
	}

	private defaultShouldRetry(reason: PathStatus, attempt: number): boolean {
		if (reason === PathStatus.NoPath) return false;
		if (reason === PathStatus.ClosestOutOfRange) return false;

		return attempt < this.smartOptions.maxRetries;
	}

	// Enhanced computeAsync with retry tracking
	async computeAsync(start: Vector3, finish: Vector3): Promise<PathStatus> {
		this.lastStart = start;
		this.lastFinish = finish;
		this.retryAttempts = 0;
		return super.computeAsync(start, finish);
	}

	// Enhanced startFollowing with retry context tracking
	startFollowing(humanoid: Humanoid, waypointReachedDistance: number = 5): void {
		this.currentHumanoid = humanoid;
		this.currentWaypointDistance = waypointReachedDistance;
		super.startFollowing(humanoid, waypointReachedDistance);
	}

	private async handleBlocked(): Promise<void> {
		if (!this.shouldAttemptRetry()) return;

		this.retryAttempts++;

		await this.waitForRetry();

		if (this.lastStart && this.lastFinish) {
			try {
				const status = await this.computeAsync(this.lastStart, this.lastFinish);
				if (status === PathStatus.Success && this.currentHumanoid) {
					this.startFollowing(this.currentHumanoid, this.currentWaypointDistance);
				}
			} catch (error) {
				warn(`SmartPath retry failed: ${error}`);
			}
		}
	}

	private async handleFailure(reason: PathStatus): Promise<void> {
		if (!this.smartOptions.shouldRetry(reason, this.retryAttempts)) return;
		if (!this.shouldAttemptRetry()) return;

		this.retryAttempts++;

		await this.waitForRetry();

		if (this.lastStart && this.lastFinish) {
			try {
				await this.computeAsync(this.lastStart, this.lastFinish);
			} catch (error) {
				warn(`SmartPath retry failed: ${error}`);
			}
		}
	}

	private shouldAttemptRetry(): boolean {
		return this.retryAttempts < this.smartOptions.maxRetries;
	}

	private async waitForRetry(): Promise<void> {
		let delay = this.smartOptions.retryDelay;

		if (this.smartOptions.useExponentialBackoff) {
			delay *= math.pow(2, this.retryAttempts - 1);
		}

		return new Promise<void>((resolve) => {
			task.wait(delay);
			resolve();
		});
	}

	// Gets the current retry attempt count
	getRetryAttempts(): number {
		return this.retryAttempts;
	}

	// Gets the maximum retry attempts allowed
	getMaxRetries(): number {
		return this.smartOptions.maxRetries;
	}

	// Checks if retries are exhausted
	areRetriesExhausted(): boolean {
		return this.retryAttempts >= this.smartOptions.maxRetries;
	}

	// Resets the retry counter
	resetRetries(): void {
		this.retryAttempts = 0;
	}

	// Gets the smart path configuration
	getSmartOptions(): Required<SmartPathOptions> {
		return { ...this.smartOptions };
	}

	// Destroy method that clears retry state
	destroy(): void {
		this.lastStart = undefined;
		this.lastFinish = undefined;
		this.currentHumanoid = undefined;
		this.currentWaypointDistance = undefined;
		this.retryAttempts = 0;
		super.destroy();
	}
}
