/**
 * Surface-local challenge trace.
 * Records what was committed and what a landing actually was.
 * Not a MathForge SDK type and not a difficulty score.
 */

export type FailureClass = 'none' | 'math' | 'wave' | 'timer';

export type CommitmentSource = 'initial-burst' | 'after-resolve';

export interface SpawnedOption {
  id: string;
  value: number | string;
  isCorrect: boolean;
  errorModel?: string;
}

export interface ChallengeSpawnRecord {
  kind: 'spawn';
  challengeId: string;
  rowIdx: number;
  modeId: string;
  /** Activity intent that was asked of the generator (level mathConfig). */
  requested: Record<string, unknown>;
  correctAnswer: number | string;
  options: SpawnedOption[];
  /** initial-burst rows exist before any attempt. after-resolve rows are created after a graded landing. */
  commitment: CommitmentSource;
  /** Attempts already graded in this session when this row was generated. Null burst = 0. */
  attemptsBeforeGenerate: number;
  atMs: number;
}

export interface AttemptRecord {
  kind: 'attempt';
  challengeId: string;
  rowIdx: number;
  optionId: string;
  correct: boolean;
  /** Math miss. Wave/timer are not math misses. */
  failureClass: FailureClass;
  hintActive: boolean;
  timeLeft: number;
  waveGap: number | null;
  /** performance.now() when the jump was requested. */
  tapAtMs: number | null;
  /** performance.now() when resolveAnswer ran. */
  landAtMs: number;
  alreadyResolved: boolean;
}

export interface SurvivalRecord {
  kind: 'survival';
  failureClass: 'wave' | 'timer';
  deathType: string;
  /** Set when death happens during a jump that has not been graded yet. */
  pendingChallengeId: string | null;
  pendingOptionId: string | null;
  waveGap: number | null;
  timeLeft: number;
  atMs: number;
}

export type TraceEvent = ChallengeSpawnRecord | AttemptRecord | SurvivalRecord;

export interface PendingMotorCommit {
  challengeId: string | null;
  optionId: string | null;
  rowIdx: number;
  tapAtMs: number;
  timeLeft: number;
  hintActive: boolean;
  waveGap: number | null;
}

const MAX_EVENTS = 400;

export class ChallengeTrace {
  events: TraceEvent[] = [];
  pending: PendingMotorCommit | null = null;

  reset(): void {
    this.events = [];
    this.pending = null;
  }

  private push(event: TraceEvent): void {
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }
  }

  noteSpawn(record: Omit<ChallengeSpawnRecord, 'kind' | 'atMs'>): void {
    this.push({ ...record, kind: 'spawn', atMs: nowMs() });
  }

  noteMotorCommit(pending: PendingMotorCommit): void {
    this.pending = pending;
  }

  clearMotorCommit(): void {
    this.pending = null;
  }

  noteAttempt(record: Omit<AttemptRecord, 'kind' | 'landAtMs'>): void {
    this.push({ ...record, kind: 'attempt', landAtMs: nowMs() });
    this.pending = null;
  }

  noteSurvival(record: Omit<SurvivalRecord, 'kind' | 'atMs'>): void {
    this.push({ ...record, kind: 'survival', atMs: nowMs() });
  }

  spawns(): ChallengeSpawnRecord[] {
    return this.events.filter((e): e is ChallengeSpawnRecord => e.kind === 'spawn');
  }

  attempts(): AttemptRecord[] {
    return this.events.filter((e): e is AttemptRecord => e.kind === 'attempt');
  }

  /** Rows that already exist before the learner has produced `attemptCount` graded attempts. */
  committedAhead(attemptCount: number): ChallengeSpawnRecord[] {
    return this.spawns().filter((s) => s.attemptsBeforeGenerate <= attemptCount);
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
