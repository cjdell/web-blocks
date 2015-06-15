/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import part from './Partition';
import cmd from './Command';
import com from './Common';

module World {
  export interface World {
    init(): void;
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
    var capacity = worldInfo.worldDimensionsInPartitions.x * worldInfo.worldDimensionsInPartitions.y * worldInfo.worldDimensionsInPartitions.z;
    var partitionCapacity = worldInfo.partitionDimensionsInBlocks.x * worldInfo.partitionDimensionsInBlocks.y * worldInfo.partitionDimensionsInBlocks.z;
    var worldDimensionsInBlocks = new THREE.Vector3(worldInfo.worldDimensionsInPartitions.x * worldInfo.partitionDimensionsInBlocks.x, worldInfo.worldDimensionsInPartitions.y * worldInfo.partitionDimensionsInBlocks.y, worldInfo.worldDimensionsInPartitions.z * worldInfo.partitionDimensionsInBlocks.z);

    var partitions: part.Partition[];

    var h: number;

    function init(): void {
      h = Math.random() * worldInfo.partitionDimensionsInBlocks.y * worldInfo.worldDimensionsInPartitions.y;

      partitions = new Array<part.Partition>(capacity);

      for (var z = 0; z < worldInfo.worldDimensionsInPartitions.z; z++) {
        for (var y = 0; y < worldInfo.worldDimensionsInPartitions.y; y++) {
          for (var x = 0; x < worldInfo.worldDimensionsInPartitions.x; x++) {
            var partitionPosition = new THREE.Vector3(x, y, z);
            var partitionIndex = getPartitionIndex(x, y, z);

            var partition = part.NewPartition(worldInfo.partitionDimensionsInBlocks, partitionPosition, worldInfo.worldDimensionsInPartitions, partitionIndex);

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
      var partition = partitions[partitionIndex];

      partition.initIfRequired();

      return partition;
    }

    function getPartitionByIndex(partitionIndex: number): part.Partition {
      var partition = getPartition(partitionIndex);

      partition.setRandomHeight(h);

      return partition;
    }

    function getBlockDimensions(): THREE.Vector3 {
      return worldDimensionsInBlocks;
    }

    function getBlock(pos: THREE.Vector3): number {
      var px = (pos.x / worldInfo.partitionDimensionsInBlocks.x) | 0;
      var py = (pos.y / worldInfo.partitionDimensionsInBlocks.y) | 0;
      var pz = (pos.z / worldInfo.partitionDimensionsInBlocks.z) | 0;

      var partitionIndex = getPartitionIndex(px, py, pz);
      var partition = getPartition(partitionIndex);

      var rx = pos.x - px * worldInfo.partitionDimensionsInBlocks.x;
      var ry = pos.y - py * worldInfo.partitionDimensionsInBlocks.y;
      var rz = pos.z - pz * worldInfo.partitionDimensionsInBlocks.z;

      //console.log(rx, ry, rz)

      return partition.getBlock(new THREE.Vector3(rx, ry, rz))[0];
    }

    function applyCommand(command: cmd.Command): void {
      var indices = command.getAffectedPartitionIndices();

      // console.log('applyCommand: indices:', indices);

      var partitions = indices.map(getPartitionByIndex);

      partitions.forEach(function(partition) {
        command.redo(partition);
      });
    }

    function setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number, colour: number): void {
      var command = new cmd.CuboidCommand(worldInfo, 0, {
        start: start,
        end: end,
        type: type,
        colour: colour
      });

      return applyCommand(command);
    }

    function addBlock(index: number, side: number, type: number): void {
      var position = getPositionFromIndex(index);

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
      var z = Math.floor(index / (worldDimensionsInBlocks.x * worldDimensionsInBlocks.y));
      var y = Math.floor((index - z * worldDimensionsInBlocks.x * worldDimensionsInBlocks.y) / worldDimensionsInBlocks.x);
      var x = index - worldDimensionsInBlocks.x * (y + worldDimensionsInBlocks.y * z);

      return new THREE.Vector3(x, y, z);
    }

    function getPartitionBoundaries(): any[] {
      var partitionBoundaries = <any[]>[];

      for (var z = 0; z < worldInfo.worldDimensionsInPartitions.z; z++) {
        for (var y = 0; y < worldInfo.worldDimensionsInPartitions.y; y++) {
          for (var x = 0; x < worldInfo.worldDimensionsInPartitions.x; x++) {
            var partitionIndex = getPartitionIndex(x, y, z);

            var boundaryPoints = <THREE.Vector3[]>[];

            for (var bx = 0; bx < 2; bx++) {
              for (var by = 0; by < 2; by++) {
                for (var bz = 0; bz < 2; bz++) {
                  var x1 = worldInfo.partitionDimensionsInBlocks.x * (x + bx);
                  var y1 = worldInfo.partitionDimensionsInBlocks.y * (y + by);
                  var z1 = worldInfo.partitionDimensionsInBlocks.z * (z + bz);

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
      var dirty = <number[]>[];

      for (var partitionIndex = 0; partitionIndex < capacity; partitionIndex++) {
        //var partition = getPartition(partitionIndex);
        var partition = partitions[partitionIndex];

        if (partition.isDirty()) {
          dirty.push(partitionIndex);
        }
      }

      return dirty;
    }

    return {
      init: init,
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
