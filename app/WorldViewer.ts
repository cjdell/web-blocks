import THREE = require('three');
import _ = require('underscore');

import wi from './WorkerInterface';

module WorldViewer {
  export interface WorldViewer {
    exposeNewPartitions(changes: number[]): void
  }

  interface PartitionCacheItem {
    mesh: THREE.Mesh;
    index: number;
  }

  export function NewWorldViewer(scene: THREE.Scene, worldInfo: any, shaderMaterial: THREE.Material, workerInterface: wi.WorkerInterface): WorldViewer {
    let partitionCaches: PartitionCacheItem[] = null;

    init();

    workerInterface.addChangeListener(function(data: any) {
      let changeIndices = <number[]>data.changes;
      let visibleIndices = <number[]>getVisiblePartitionIndices();

      let toUpdate = _.intersection(changeIndices, visibleIndices);

      toUpdate.forEach(function(index) {
        updatePartition(index);
      });
    });

    function init() {
      partitionCaches = new Array(worldInfo.partitionCapacity);

      addSky();
    }

    function getMesh(bufferGeometry: THREE.BufferGeometry, offset: THREE.Vector3): THREE.Mesh {
      let mesh = new THREE.Mesh(bufferGeometry, shaderMaterial);

      mesh.position.x += offset.x + 8;
      mesh.position.y += offset.y + 16;
      mesh.position.z += offset.z + 8;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      return mesh;
    }

    function addPartition(partitionIndex: number): void {
      let partitionCache = partitionCaches[partitionIndex];

      if (!partitionCache) {
        workerInterface.getPartition(partitionIndex).then(gotPartition);
        return;
      }

      scene.add(partitionCache.mesh);
    }

    function updatePartition(partitionIndex: number) {
      workerInterface.getPartition(partitionIndex).then(gotPartition);
    }

    function getVisiblePartitionIndices() {
      return partitionCaches
      .filter(function(partitionCache) {
        return partitionCache.mesh !== null;
      })
      .map(function(partitionCache) {
        return partitionCache.index;
      });
    }

    function gotPartition(data: any) {
      let geo = data.geo, partitionIndex = data.index;

      let partitionCache = partitionCaches[partitionIndex];

      if (partitionCache) {
        scene.remove(partitionCache.mesh);

        partitionCache.mesh = null;
      }

      let bufferGeometry = new THREE.BufferGeometry();

      bufferGeometry.addAttribute('position', new THREE.BufferAttribute(geo.data.position, 3));
      bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(geo.data.normal, 3));
      bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(geo.data.uv, 2));
      bufferGeometry.addAttribute('data', new THREE.BufferAttribute(geo.data.data, 4));
      bufferGeometry.addAttribute('offset', new THREE.BufferAttribute(geo.data.offset, 1));

      bufferGeometry.computeBoundingSphere();
      bufferGeometry.computeBoundingBox();

      let mesh = getMesh(bufferGeometry, geo.offset);

      partitionCache = {
        index: partitionIndex,
        mesh: mesh
      };

      partitionCaches[partitionIndex] = partitionCache;

      scene.add(partitionCache.mesh);
    }

    function removePartition(partitionIndex: number) {
      let partitionCache = partitionCaches[partitionIndex];

      if (!partitionCache) return;

      scene.remove(partitionCache.mesh);
    }

    function exposeNewPartitions(changes: any) {
      changes.toBeAdded.forEach(function(partitionIndex: number) {
        //console.log('toBeAdded', partitionIndex);
        addPartition(partitionIndex);
      });

      changes.toBeRemoved.forEach(function(partitionIndex: number) {
        removePartition(partitionIndex);
      });
    }

    function addSky() {
      let geometry = new THREE.PlaneBufferGeometry(1, 1);
      let material = new THREE.MeshBasicMaterial({ color: 0xbbccff, side: THREE.DoubleSide });
      let plane = new THREE.Mesh(geometry, material);

      plane.position.x = worldInfo.blockDimensions.x / 2;
      plane.position.y = 100;
      plane.position.z = worldInfo.blockDimensions.z / 2;

      plane.rotation.x = Math.PI / 2;

      plane.scale.x = (worldInfo.blockDimensions.x * 100);
      plane.scale.y = (worldInfo.blockDimensions.z * 100);

      scene.add(plane);
    }

    return {
      exposeNewPartitions: exposeNewPartitions
    };
  }
}

export default WorldViewer;
