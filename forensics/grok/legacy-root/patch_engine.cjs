const fs = require('fs');
let code = fs.readFileSync('src/engine/GameEngine.ts', 'utf8');

// Add a property to track loop ID
code = code.replace(
  'animationFrameId: number | null = null;',
  'animationFrameId: number | null = null;\n  loopInstanceId: number = 0;'
);

// Add logging to start and cleanup
code = code.replace(
  '  start() {',
  '  start() {\n    this.loopInstanceId++;\n    console.log(`[GameEngine] start() called. Spawning loop instance ${this.loopInstanceId}`);'
);

code = code.replace(
  '  cleanup() {',
  '  cleanup() {\n    console.log(`[GameEngine] cleanup() called. Terminating loop instance ${this.loopInstanceId}`);'
);

// Add a warning inside loop if it gets orphaned (though cancelAnimationFrame should prevent this)
code = code.replace(
  '  loop = (time: number) => {',
  '  loop = (time: number) => {\n    // Ownership verification for Phase 1A\n    if (this.animationFrameId === null) {\n      console.warn(`[GameEngine] Orphaned loop instance detected and prevented!`);\n      return;\n    }'
);

fs.writeFileSync('src/engine/GameEngine.ts', code);
