/**
 * Centralized Development Telemetry Authority (R1).
 *
 * OBSERVATIONAL ONLY:
 * No gameplay system may read telemetry state to determine behavior.
 * Turning telemetry OFF does not alter physics, math, campaign progression,
 * Plasma, timer, audio, level generation, or input semantics.
 */

export type TelemetryCategory =
  | 'APP'
  | 'NAVIGATION'
  | 'INPUT'
  | 'SETTINGS'
  | 'REVIEW'
  | 'CAMPAIGN'
  | 'LEVEL'
  | 'MATH'
  | 'PLAYER'
  | 'PLATFORM'
  | 'PLASMA'
  | 'TIMER'
  | 'DEATH'
  | 'RECOVERY'
  | 'AUDIO'
  | 'ERROR'
  | 'PERFORMANCE';

export interface TelemetryEvent {
  seq: number;
  timestamp: number;
  isoTime: string;
  category: TelemetryCategory;
  event: string;
  screen?: string;
  levelId?: string | null;
  sectorId?: string | null;
  payload?: Record<string, unknown>;
}

export interface CapturedError {
  seq: number;
  timestamp: number;
  message: string;
  source: string;
  stack?: string;
  screen?: string;
  levelId?: string | null;
}

export interface DiagnosticReport {
  version: string;
  generatedAt: string;
  environment: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
  };
  state: {
    telemetryEnabled: boolean;
    screen?: string;
    levelId?: string | null;
    sectorId?: string | null;
    reviewMode?: boolean;
    reviewUnlockAllLevels?: boolean;
    progressSummary?: Record<string, unknown>;
  };
  totalEventsLogged: number;
  bufferedEventsCount: number;
  errorsCount: number;
  errors: CapturedError[];
  events: TelemetryEvent[];
}

export class DevelopmentTelemetryService {
  private static instance: DevelopmentTelemetryService | null = null;

  public static getInstance(): DevelopmentTelemetryService {
    if (!DevelopmentTelemetryService.instance) {
      DevelopmentTelemetryService.instance = new DevelopmentTelemetryService();
    }
    return DevelopmentTelemetryService.instance;
  }

  // Master switch: default to true in development/review builds
  private enabled: boolean = true;
  private verboseTrace: boolean = false;
  private seqCounter: number = 0;
  private readonly maxBufferSize: number = 3000;
  private readonly buffer: TelemetryEvent[] = [];
  private readonly errorBuffer: CapturedError[] = [];

  // Context tags
  private currentScreen: string = 'init';
  private currentLevelId: string | null = null;
  private currentSectorId: string | null = null;
  private reviewModeActive: boolean = false;
  private reviewUnlockActive: boolean = false;

  private listenersAttached: boolean = false;

  constructor() {
    this.initGlobalListeners();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    const prev = this.enabled;
    this.enabled = val;
    if (prev !== val) {
      this.recordEvent('SETTINGS', val ? 'telemetry_enabled' : 'telemetry_disabled', {
        previous: prev,
        current: val,
      });
    }
  }

  public setVerboseTrace(val: boolean): void {
    this.verboseTrace = val;
    this.recordEvent('SETTINGS', 'verbose_trace_toggled', { verboseTrace: val });
  }

  public isVerboseTrace(): boolean {
    return this.verboseTrace;
  }

  public setContext(context: {
    screen?: string;
    levelId?: string | null;
    sectorId?: string | null;
    reviewMode?: boolean;
    reviewUnlockAllLevels?: boolean;
  }): void {
    if (context.screen !== undefined) this.currentScreen = context.screen;
    if (context.levelId !== undefined) this.currentLevelId = context.levelId;
    if (context.sectorId !== undefined) this.currentSectorId = context.sectorId;
    if (context.reviewMode !== undefined) this.reviewModeActive = context.reviewMode;
    if (context.reviewUnlockAllLevels !== undefined) this.reviewUnlockActive = context.reviewUnlockAllLevels;
  }

  public recordEvent(
    category: TelemetryCategory,
    event: string,
    payload?: Record<string, unknown>
  ): TelemetryEvent {
    this.seqCounter++;
    const now = Date.now();
    const entry: TelemetryEvent = {
      seq: this.seqCounter,
      timestamp: now,
      isoTime: new Date(now).toISOString(),
      category,
      event,
      screen: this.currentScreen,
      levelId: this.currentLevelId,
      sectorId: this.currentSectorId,
      payload,
    };

    // Bounded ring buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Console mirror when enabled
    if (this.enabled) {
      const payloadStr = payload ? ` ${JSON.stringify(payload)}` : '';
      console.log(`[JUMPMATH][${category}] ${event} (seq=${entry.seq}, screen=${entry.screen})${payloadStr}`);
    }

    return entry;
  }

  public recordError(message: string, source: string, stack?: string): void {
    const now = Date.now();
    const errEntry: CapturedError = {
      seq: ++this.seqCounter,
      timestamp: now,
      message,
      source,
      stack,
      screen: this.currentScreen,
      levelId: this.currentLevelId,
    };

    this.errorBuffer.push(errEntry);
    if (this.errorBuffer.length > 500) {
      this.errorBuffer.shift();
    }

    this.recordEvent('ERROR', 'application_error_captured', {
      message,
      source,
      stack: stack ? stack.slice(0, 300) : undefined,
    });
  }

  private initGlobalListeners(): void {
    if (this.listenersAttached || typeof window === 'undefined') return;
    this.listenersAttached = true;

    window.addEventListener('error', (event: ErrorEvent) => {
      this.recordError(
        event.message || 'Unknown window error',
        `${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`,
        event.error?.stack
      );
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.recordError(message, 'unhandledrejection', stack);
    });
  }

  public getEvents(): ReadonlyArray<TelemetryEvent> {
    return this.buffer;
  }

  public getErrors(): ReadonlyArray<CapturedError> {
    return this.errorBuffer;
  }

  public getSequence(): number {
    return this.seqCounter;
  }

  public clearBuffer(): void {
    this.buffer.length = 0;
    this.errorBuffer.length = 0;
    this.recordEvent('APP', 'telemetry_buffer_cleared');
  }

  public exportReport(progressSummary?: Record<string, unknown>): DiagnosticReport {
    const isBrowser = typeof window !== 'undefined';
    return {
      version: '2.0.0-phase4c',
      generatedAt: new Date().toISOString(),
      environment: {
        url: (typeof window !== 'undefined' && window.location?.href) || 'headless',
        userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || 'node/headless',
        viewport: {
          width: (typeof window !== 'undefined' && window.innerWidth) || 500,
          height: (typeof window !== 'undefined' && window.innerHeight) || 800,
        },
        devicePixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
      },
      state: {
        telemetryEnabled: this.enabled,
        screen: this.currentScreen,
        levelId: this.currentLevelId,
        sectorId: this.currentSectorId,
        reviewMode: this.reviewModeActive,
        reviewUnlockAllLevels: this.reviewUnlockActive,
        progressSummary,
      },
      totalEventsLogged: this.seqCounter,
      bufferedEventsCount: this.buffer.length,
      errorsCount: this.errorBuffer.length,
      errors: [...this.errorBuffer],
      events: [...this.buffer],
    };
  }

  public copyReportToClipboard(progressSummary?: Record<string, unknown>): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      console.warn('[JUMPMATH] Clipboard API unavailable');
      return Promise.resolve(false);
    }
    const report = this.exportReport(progressSummary);
    const json = JSON.stringify(report, null, 2);
    return navigator.clipboard.writeText(json).then(
      () => {
        this.recordEvent('APP', 'diagnostics_copied_to_clipboard');
        return true;
      },
      (err) => {
        this.recordError(err.message, 'clipboard_write');
        return false;
      }
    );
  }

  public downloadReportFile(progressSummary?: Record<string, unknown>): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const report = this.exportReport(progressSummary);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jumpmath-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.recordEvent('APP', 'diagnostics_file_downloaded');
  }
}

export const telemetry = DevelopmentTelemetryService.getInstance();
