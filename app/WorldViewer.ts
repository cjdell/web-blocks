"use strict";
import THREE = require('three');
import _ = require('underscore');

import WorkerInterface from './WorkerInterface';
import com from '../common/WorldInfo';

interface PartitionCacheItem {
  mesh: THREE.Mesh;
  index: number;
}

export default class WorldViewer {
  scene: THREE.Scene;
  worldInfo: com.WorldInfo;
  shaderMaterial: THREE.Material;
  workerInterface: WorkerInterface;

  partitionCaches: PartitionCacheItem[] = null;

  constructor(scene: THREE.Scene, worldInfo: com.WorldInfo, shaderMaterial: THREE.Material, workerInterface: WorkerInterface) {
    this.scene = scene;
    this.worldInfo = worldInfo;
    this.shaderMaterial = shaderMaterial;
    this.workerInterface = workerInterface;

    workerInterface.addChangeListener(data => {
      let changeIndices = <number[]>data.changes;
      let visibleIndices = <number[]>this.getVisiblePartitionIndices();

      let toUpdate = _.intersection(changeIndices, visibleIndices);

      toUpdate.forEach(index => this.updatePartition(index));
    });

    this.partitionCaches = new Array<PartitionCacheItem>(this.worldInfo.partitionCapacity);

    this.addSky();
  }

  getMesh(bufferGeometry: THREE.BufferGeometry, offset: THREE.Vector3): THREE.Mesh {
    let mesh = new THREE.Mesh(bufferGeometry, this.shaderMaterial);

    mesh.position.x += offset.x;
    mesh.position.y += offset.y;
    mesh.position.z += offset.z;

    return mesh;
  }

  addPartition(partitionIndex: number): void {
    let partitionCache = this.partitionCaches[partitionIndex];

    if (!partitionCache) {
      this.workerInterface.getPartition(partitionIndex).then(data => this.gotPartition(data));
      return;
    }

    this.scene.add(partitionCache.mesh);
  }

  updatePartition(partitionIndex: number) {
    this.workerInterface.getPartition(partitionIndex).then(data => this.gotPartition(data));
  }

  getVisiblePartitionIndices() {
    return this.partitionCaches
      .filter(function (partitionCache) {
        return partitionCache.mesh !== null;
      })
      .map(function (partitionCache) {
        return partitionCache.index;
      });
  }

  gotPartition(data: any) {
    let geo = data.geo, partitionIndex = data.index;

    let partitionCache = this.partitionCaches[partitionIndex];

    if (partitionCache) {
      this.scene.remove(partitionCache.mesh);

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

    let mesh = this.getMesh(bufferGeometry, geo.offset);

    partitionCache = {
      index: partitionIndex,
      mesh: mesh
    };

    this.partitionCaches[partitionIndex] = partitionCache;

    this.scene.add(partitionCache.mesh);
  }

  removePartition(partitionIndex: number) {
    let partitionCache = this.partitionCaches[partitionIndex];

    if (!partitionCache) return;

    this.scene.remove(partitionCache.mesh);
  }

  exposeNewPartitions(changes: any) {
    changes.toBeAdded.forEach((partitionIndex: number) => this.addPartition(partitionIndex));
    changes.toBeRemoved.forEach((partitionIndex: number) => this.removePartition(partitionIndex));
  }

  addSky() {
    let geometry = new THREE.PlaneBufferGeometry(1, 1);
    let material = new THREE.MeshBasicMaterial({ color: 0xbbccff, side: THREE.DoubleSide });
    let plane = new THREE.Mesh(geometry, material);

    plane.position.x = this.worldInfo.worldDimensionsInBlocks.x / 2;
    plane.position.y = 128;
    plane.position.z = this.worldInfo.worldDimensionsInBlocks.z / 2;

    plane.rotation.x = Math.PI / 2;

    plane.scale.x = (this.worldInfo.worldDimensionsInBlocks.x * 100);
    plane.scale.y = (this.worldInfo.worldDimensionsInBlocks.z * 100);

    this.scene.add(plane);
  }
}
