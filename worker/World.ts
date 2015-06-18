/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import part from './Partition';
import cmd from './Commands/Command';
import cc from './Commands/CuboidCommand';
import lc from './Commands/LandscapeCommand';
import com from '../common/Common';

module World {
  export interface World {
    init(): void;
    undo(): void;
    getPartitionCapacity(): number;
    getBlockDimensions(): THREE.Vector3;
    getPartitionByIndex(partitionIndex: number): part.Partition;
    getBlock(pos: THREE.Vector3): number;
    addBlock(index: number, side: number, type: number): void;
    setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number, colour: number): void;
    getDirtyPartitions(): number[];
  }

  export function NewWorld(worldInfo: com.WorldInfo): World {
    const capacity = worldInfo.worldDimensionsInPartitions.x * worldInfo.worldDimensionsInPartitions.y * worldInfo.worldDimensionsInPartitions.z;
    const partitionCapacity = worldInfo.partitionDimensionsInBlocks.x * worldInfo.partitionDimensionsInBlocks.y * worldInfo.partitionDimensionsInBlocks.z;
    const worldDimensionsInBlocks = new THREE.Vector3(worldInfo.worldDimensionsInPartitions.x * worldInfo.partitionDimensionsInBlocks.x, worldInfo.worldDimensionsInPartitions.y * worldInfo.partitionDimensionsInBlocks.y, worldInfo.worldDimensionsInPartitions.z * worldInfo.partitionDimensionsInBlocks.z);

    worldInfo.worldDimensionsInBlocks = worldDimensionsInBlocks;
    worldInfo.partitionBoundaries = getPartitionBoundaries();

    let partitions: part.Partition[];

    const commands = new Array<cmd.Command>();

    function init(): void {
      partitions = new Array<part.Partition>(capacity);

      for (let z = 0; z < worldInfo.worldDimensionsInPartitions.z; z++) {
        for (let y = 0; y < worldInfo.worldDimensionsInPartitions.y; y++) {
          for (let x = 0; x < worldInfo.worldDimensionsInPartitions.x; x++) {
            const partitionPosition = new THREE.Vector3(x, y, z);
            const partitionIndex = getPartitionIndex(x, y, z);

            const partition = part.NewPartition(worldInfo.partitionDimensionsInBlocks, partitionPosition, worldInfo.worldDimensionsInPartitions, partitionIndex);

            partitions[partitionIndex] = partition;
          }
        }
      }

      // Apply the default landscape
      const randomHeight = Math.random() * worldInfo.partitionDimensionsInBlocks.y * worldInfo.worldDimensionsInPartitions.y;
      const landscapeCommand = new lc.LandscapeCommand(this.worldInfo, 0, { height: randomHeight });

      applyCommand(landscapeCommand);
    }

    function getPartitionCapacity(): number {
      return partitionCapacity;
    }

    function getPartitions(): part.Partition[] {
      return partitions;
    }

    // Lazily load the partitions at they are needed
    function getPartitionByIndex(partitionIndex: number): part.Partition {
      const partition = partitions[partitionIndex];

      partition.initIfRequired();

      // Apply commands as partitions are brought into existance
      commands.forEach(function(command) {
        const indices = command.getAffectedPartitionIndices();

        if (indices === null || indices.indexOf(partitionIndex) !== -1) {
          command.redo(partition);
        }
      });

      return partition;
    }

    function getBlockDimensions(): THREE.Vector3 {
      return worldDimensionsInBlocks;
    }

    function getBlock(pos: THREE.Vector3): number {
      const px = (pos.x / worldInfo.partitionDimensionsInBlocks.x) | 0;
      const py = (pos.y / worldInfo.partitionDimensionsInBlocks.y) | 0;
      const pz = (pos.z / worldInfo.partitionDimensionsInBlocks.z) | 0;

      const partitionIndex = getPartitionIndex(px, py, pz);
      const partition = partitions[partitionIndex];

      if (!partition.isInited()) return 0;

      const rx = pos.x - px * worldInfo.partitionDimensionsInBlocks.x;
      const ry = pos.y - py * worldInfo.partitionDimensionsInBlocks.y;
      const rz = pos.z - pz * worldInfo.partitionDimensionsInBlocks.z;

      return partition.getBlock(new THREE.Vector3(rx, ry, rz))[0];
    }

    function applyCommand(command: cmd.Command): void {
      commands.push(command);

      const indices = command.getAffectedPartitionIndices();
      let partitionsToApply = partitions;

      if (indices !== null) partitionsToApply = indices.map(i => partitions[i]);

      partitionsToApply.filter(p => p.isInited()).forEach(command.redo, command);
    }

    function undo(): void {
      if (commands.length === 0) return;

      const command = commands.pop();

      const indices = command.getAffectedPartitionIndices();
      let partitionsToApply = partitions;

      if (indices !== null) partitionsToApply = indices.map(i => partitions[i]);

      partitionsToApply.filter(p => p.isInited()).forEach(command.undo, command);
    }

    function setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number, colour: number): void {
      const command = new cc.CuboidCommand(worldInfo, 0, {
        start: start,
        end: end,
        type: type,
        colour: colour
      });

      return applyCommand(command);
    }

    function addBlock(index: number, side: number, type: number): void {
      const position = com.getWorldPositionFromIndex(worldInfo, index);

      if (type === 0) {
        return setBlocks(position, position, type, 0);
      }

      if (side === 0.0) {
        position.x++;
      }
      if (side === 1.0) {
        position.x--;
      }
      if (side === 2.0) {
        position.y++;
      }
      if (side === 3.0) {
        position.y--;
      }
      if (side === 4.0) {
        position.z++;
      }
      if (side === 5.0) {
        position.z--;
      }

      setBlocks(position, position, type, 0);
    }

    function getPartitionIndex(x: number, y: number, z: number): number {
      return x + worldInfo.worldDimensionsInPartitions.x * (y + worldInfo.worldDimensionsInPartitions.y * z);
    }

    function getPartitionBoundaries(): any[] {
      const partitionBoundaries = <any[]>[];

      for (let z = 0; z < worldInfo.worldDimensionsInPartitions.z; z++) {
        for (let y = 0; y < worldInfo.worldDimensionsInPartitions.y; y++) {
          for (let x = 0; x < worldInfo.worldDimensionsInPartitions.x; x++) {
            const partitionIndex = getPartitionIndex(x, y, z);

            const boundaryPoints = <THREE.Vector3[]>[];

            for (let bx = 0; bx < 2; bx++) {
              for (let by = 0; by < 2; by++) {
                for (let bz = 0; bz < 2; bz++) {
                  const x1 = worldInfo.partitionDimensionsInBlocks.x * (x + bx);
                  const y1 = worldInfo.partitionDimensionsInBlocks.y * (y + by);
                  const z1 = worldInfo.partitionDimensionsInBlocks.z * (z + bz);

                  boundaryPoints.push(new THREE.Vector3(x1, y1, z1));
                }
              }
            }

            partitionBoundaries.push({ partitionIndex: partitionIndex, points: boundaryPoints });
          }
        }
      }

      return partitionBoundaries;
    }

    function getDirtyPartitions(): number[] {
      const dirty = <number[]>[];

      for (let partitionIndex = 0; partitionIndex < capacity; partitionIndex++) {
        const partition = partitions[partitionIndex];

        if (partition.isDirty()) {
          dirty.push(partitionIndex);
        }
      }

      return dirty;
    }

    return {
      init: init,
      undo: undo,
      getBlock: getBlock,
      setBlocks: setBlocks,
      addBlock: addBlock,
      getPartitionCapacity: getPartitionCapacity,
      getPartitions: getPartitions,
      getPartitionByIndex: getPartitionByIndex,
      getBlockDimensions: getBlockDimensions,
      getDirtyPartitions: getDirtyPartitions
    };
  }
}

export default World;
