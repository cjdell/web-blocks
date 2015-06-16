/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import part from './Partition';
import cmd from './Commands/Command';
import cc from './Commands/CuboidCommand';
import com from './Common';

module World {
  export interface World {
    init(): void;
    undo(): void;
    getPartitionCapacity(): number;
    getPartitionBoundaries(): any;
    getBlockDimensions(): THREE.Vector3;
    getPartitionByIndex(partitionIndex: number): part.Partition;
    getBlock(pos: THREE.Vector3): number;
    addBlock(index: number, side: number, type: number): void;
    setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number, colour: number): void;
    getDirtyPartitions(): number[];
  }

  export function NewWorld(worldInfo: com.WorldInfo): World {
    let capacity = worldInfo.worldDimensionsInPartitions.x * worldInfo.worldDimensionsInPartitions.y * worldInfo.worldDimensionsInPartitions.z;
    let partitionCapacity = worldInfo.partitionDimensionsInBlocks.x * worldInfo.partitionDimensionsInBlocks.y * worldInfo.partitionDimensionsInBlocks.z;
    let worldDimensionsInBlocks = new THREE.Vector3(worldInfo.worldDimensionsInPartitions.x * worldInfo.partitionDimensionsInBlocks.x, worldInfo.worldDimensionsInPartitions.y * worldInfo.partitionDimensionsInBlocks.y, worldInfo.worldDimensionsInPartitions.z * worldInfo.partitionDimensionsInBlocks.z);

    let partitions: part.Partition[];

    let h: number;

    function init(): void {
      h = Math.random() * worldInfo.partitionDimensionsInBlocks.y * worldInfo.worldDimensionsInPartitions.y;

      partitions = new Array<part.Partition>(capacity);

      for (let z = 0; z < worldInfo.worldDimensionsInPartitions.z; z++) {
        for (let y = 0; y < worldInfo.worldDimensionsInPartitions.y; y++) {
          for (let x = 0; x < worldInfo.worldDimensionsInPartitions.x; x++) {
            let partitionPosition = new THREE.Vector3(x, y, z);
            let partitionIndex = getPartitionIndex(x, y, z);

            let partition = part.NewPartition(worldInfo.partitionDimensionsInBlocks, partitionPosition, worldInfo.worldDimensionsInPartitions, partitionIndex);

            partitions[partitionIndex] = partition;
          }
        }
      }
    }

    function getPartitionCapacity(): number {
      return partitionCapacity;
    }

    function getPartitions(): part.Partition[] {
      return partitions;
    }

    function getPartition(partitionIndex: number): part.Partition {
      let partition = partitions[partitionIndex];

      partition.initIfRequired();

      return partition;
    }

    function getPartitionByIndex(partitionIndex: number): part.Partition {
      let partition = getPartition(partitionIndex);

      partition.setRandomHeight(h);

      return partition;
    }

    function getBlockDimensions(): THREE.Vector3 {
      return worldDimensionsInBlocks;
    }

    function getBlock(pos: THREE.Vector3): number {
      let px = (pos.x / worldInfo.partitionDimensionsInBlocks.x) | 0;
      let py = (pos.y / worldInfo.partitionDimensionsInBlocks.y) | 0;
      let pz = (pos.z / worldInfo.partitionDimensionsInBlocks.z) | 0;

      let partitionIndex = getPartitionIndex(px, py, pz);
      let partition = getPartition(partitionIndex);

      let rx = pos.x - px * worldInfo.partitionDimensionsInBlocks.x;
      let ry = pos.y - py * worldInfo.partitionDimensionsInBlocks.y;
      let rz = pos.z - pz * worldInfo.partitionDimensionsInBlocks.z;

      //console.log(rx, ry, rz)

      return partition.getBlock(new THREE.Vector3(rx, ry, rz))[0];
    }

    const commands = new Array<cmd.Command>();

    function applyCommand(command: cmd.Command): void {
      commands.push(command);

      const indices = command.getAffectedPartitionIndices();
      const partitions = indices.map(getPartitionByIndex);

      partitions.forEach(function(partition) {
        command.redo(partition);
      });
    }

    function undo(): void {
      if (commands.length === 0) return;
      
      const command = commands.pop();

      const indices = command.getAffectedPartitionIndices();
      const partitions = indices.map(getPartitionByIndex);

      partitions.forEach(function(partition) {
        command.undo(partition);
      });
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
      let position = getPositionFromIndex(index);

      if (type === 0) {
        return setBlocks(position, position, type, 0);
      }

      console.log('position', position);

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

    // TODO: Commonise
    function getPositionFromIndex(index: number): THREE.Vector3 {
      let z = Math.floor(index / (worldDimensionsInBlocks.x * worldDimensionsInBlocks.y));
      let y = Math.floor((index - z * worldDimensionsInBlocks.x * worldDimensionsInBlocks.y) / worldDimensionsInBlocks.x);
      let x = index - worldDimensionsInBlocks.x * (y + worldDimensionsInBlocks.y * z);

      return new THREE.Vector3(x, y, z);
    }

    function getPartitionBoundaries(): any[] {
      let partitionBoundaries = <any[]>[];

      for (let z = 0; z < worldInfo.worldDimensionsInPartitions.z; z++) {
        for (let y = 0; y < worldInfo.worldDimensionsInPartitions.y; y++) {
          for (let x = 0; x < worldInfo.worldDimensionsInPartitions.x; x++) {
            let partitionIndex = getPartitionIndex(x, y, z);

            let boundaryPoints = <THREE.Vector3[]>[];

            for (let bx = 0; bx < 2; bx++) {
              for (let by = 0; by < 2; by++) {
                for (let bz = 0; bz < 2; bz++) {
                  let x1 = worldInfo.partitionDimensionsInBlocks.x * (x + bx);
                  let y1 = worldInfo.partitionDimensionsInBlocks.y * (y + by);
                  let z1 = worldInfo.partitionDimensionsInBlocks.z * (z + bz);

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
      let dirty = <number[]>[];

      for (let partitionIndex = 0; partitionIndex < capacity; partitionIndex++) {
        //let partition = getPartition(partitionIndex);
        let partition = partitions[partitionIndex];

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
      getPartitionBoundaries: getPartitionBoundaries,
      getDirtyPartitions: getDirtyPartitions
    };
  }
}

export default World;
