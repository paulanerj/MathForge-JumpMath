import { CameraConfig } from '../config/configTypes';
import { DEFAULT_ZYX_CONFIG } from '../config/defaults';

export class Camera {
  x: number = 0;
  y: number = 0;
  config: CameraConfig;

  constructor(config: CameraConfig = DEFAULT_ZYX_CONFIG.camera) {
    this.config = config;
  }

  update(dt: number, targetX: number, targetY: number) {
    // Smooth lerp towards logical target position
    // Offset Y slightly so Zyx remains in the bottom half of the screen
    this.x += (targetX - this.x) * this.config.lerpRateX * dt;
    this.y += (targetY - this.config.targetOffsetY - this.y) * this.config.lerpRateY * dt;
  }
}
