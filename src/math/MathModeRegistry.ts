import { MathChallenge, MathChallengeRequest, MathChallengeResult, MathModeDefinition, MathModeId, MathRng } from './mathTypes';
import { SumToMode } from './modes/SumToMode';
import { SkipCountConfig, SkipCountMode } from './modes/SkipCountMode';
import { MultiplyMode } from './modes/MultiplyMode';
import { DifferenceMode } from './modes/DifferenceMode';

/**
 * Adapter mode mapping content/preset identifiers (e.g. 'skipUp', 'skipDown')
 * onto the canonical SKIP_COUNT mode with predefined direction semantics.
 */
export class AliasSkipMode implements MathModeDefinition<SkipCountConfig, number> {
  constructor(
    public readonly id: string,
    public readonly direction: 1 | -1,
    private baseMode: SkipCountMode
  ) {}

  initializeState(config: SkipCountConfig, rng: MathRng): number {
    return this.baseMode.initializeState({ ...config, direction: this.direction }, rng);
  }

  generateChallenge(request: MathChallengeRequest, rng: MathRng): MathChallenge {
    return this.baseMode.generateChallenge(
      {
        ...request,
        config: { ...request.config, direction: this.direction }
      },
      rng
    );
  }

  evaluateResult(challenge: MathChallenge, selectedOptionId: string): MathChallengeResult {
    return this.baseMode.evaluateResult(challenge, selectedOptionId);
  }

  isExhausted(state: number, config?: SkipCountConfig): boolean {
    return this.baseMode.isExhausted(state, { ...config, direction: this.direction });
  }
}

export class MathModeRegistry {
  private modes: Map<MathModeId, MathModeDefinition> = new Map();

  constructor(registerDefaults = true) {
    if (registerDefaults) {
      const skipCountMode = new SkipCountMode();
      this.registerMode(new SumToMode());
      this.registerMode(skipCountMode);
      this.registerMode(new MultiplyMode());
      this.registerMode(new DifferenceMode());
      // Convenience / content preset compatibility aliases
      this.registerMode(new AliasSkipMode('skipUp', 1, skipCountMode));
      this.registerMode(new AliasSkipMode('skipDown', -1, skipCountMode));
    }
  }

  registerMode(mode: MathModeDefinition<any, any>): void {
    this.modes.set(mode.id, mode);
  }

  getMode(id: MathModeId): MathModeDefinition | undefined {
    return this.modes.get(id);
  }

  hasMode(id: MathModeId): boolean {
    return this.modes.has(id);
  }

  listModes(): MathModeId[] {
    return Array.from(this.modes.keys());
  }

  unregisterMode(id: MathModeId): boolean {
    return this.modes.delete(id);
  }
}

export const GLOBAL_MATH_REGISTRY = new MathModeRegistry(true);
