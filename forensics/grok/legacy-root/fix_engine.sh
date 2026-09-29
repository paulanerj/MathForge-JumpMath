sed -i 's/this.loop(performance.now());/this.start();/' src/engine/GameEngine.ts
sed -i '/animationFrameId: number | null = null;/a\
\
  start() {\
    if (this.animationFrameId === null) {\
      this.lastTime = performance.now();\
      this.animationFrameId = requestAnimationFrame(this.loop);\
    }\
  }' src/engine/GameEngine.ts
sed -i 's/this.animationFrameId = requestAnimationFrame(this.loop);/this.animationFrameId = requestAnimationFrame(this.loop.bind(this));/' src/engine/GameEngine.ts
sed -i 's/cancelAnimationFrame(this.animationFrameId);/cancelAnimationFrame(this.animationFrameId);\n      this.animationFrameId = null;/' src/engine/GameEngine.ts
