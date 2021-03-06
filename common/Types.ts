/**
 * Common types shared between UI and Web workers  
 */

import com from '../common/WorldInfo';

/**
 * These values are deltas generated by the UI. Values of 0 mean nothing is changing and the player is still
 */
export interface Movement {
  move: THREE.Vector3;
  turn: THREE.Vector2;
}

export interface AddBlockArgs {
  position: com.IntVector3;
  side: number;
  type: number;
}

export interface SetBlocksArgs {
  start: com.IntVector3;
  end: com.IntVector3;
  type: number;
  colour: number;
  update: boolean;
}

export interface PlayerPositionChangeArgs {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface PlayerPositionChangeListener {
  (args: PlayerPositionChangeArgs): void;
}

export interface BoundScriptsChangeArgs {
  scripts: BoundScripts;
}

export interface BoundScriptsChangeListener {
  (args: BoundScriptsChangeArgs): void;
}

export type BoundScripts = number[];
