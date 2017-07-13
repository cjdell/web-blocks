import THREE = require('three');
import _ = require('underscore');
import WorkerInterface from './WorkerInterface';
import com from '../common/WorldInfo';
import { PartitionGeometryResult } from '../worker/WorldGeometry';

interface PartitionCacheItem {
  mesh: THREE.Mesh;
  index: number;
  visible: boolean;
  used: number;
}

const MaxLoadedPartitions = 64;

export default class WorldViewer {
  private scene: THREE.Scene;
  private worldInfo: com.WorldInfo;
  private shaderMaterial: THREE.Material;
  private workerInterface: WorkerInterface;
  private partitionCaches: PartitionCacheItem[] = null;
  private loading = false;

  constructor(
    scene: THREE.Scene,
    worldInfo: com.WorldInfo,
    shaderMaterial: THREE.Material,
    workerInterface: WorkerInterface) {

    this.scene = scene;
    this.worldInfo = worldInfo;
    this.shaderMaterial = shaderMaterial;
    this.workerInterface = workerInterface;

    workerInterface.addChangeListener(data => {
      const changeIndices = data.changes;
      const loadedIndices = this.getLoadedPartitionIndices();

      const toUpdate = _.intersection(changeIndices, loadedIndices);

      toUpdate.forEach(index => this.updatePartition(index));
    });

    this.partitionCaches = new Array<PartitionCacheItem>(this.worldInfo.partitionCapacity);

    this.addSky();

    // setInterval(() => {
    //   const loaded = this.partitionCaches.filter(partitionCache => !!partitionCache.mesh);
    //   const visible = this.partitionCaches.filter(partitionCache => partitionCache.visible);

    //   // console.log('loaded', loaded.length, 'visible', visible.length);
    // }, 1000);
  }

  getMesh(bufferGeometry: THREE.BufferGeometry, offset: com.IntVector3): THREE.Mesh {
    const mesh = new THREE.Mesh(bufferGeometry, this.shaderMaterial);

    mesh.position.x += offset.x;
    mesh.position.y += offset.y;
    mesh.position.z += offset.z;

    return mesh;
  }

  addPartition(pindex: number): Promise<void> {
    const partitionCache = this.partitionCaches[pindex];

    if (partitionCache && partitionCache.mesh) {
      this.scene.add(partitionCache.mesh);
      partitionCache.visible = true;
      partitionCache.used = Date.now();
      return Promise.resolve(null);
    } else {
      return this.workerInterface.getPartition(pindex).then(data => {
        // console.log('Generating partition', pindex);
        return this.gotPartition(data.geo, pindex);
      });
    }
  }

  updatePartition(pindex: number) {
    this.workerInterface.getPartition(pindex).then(data => {
      // console.log('Updating partition', pindex);
      return this.gotPartition(data.geo, pindex);
    });
  }

  getLoadedPartitionIndices() {
    return this.partitionCaches
      .filter(partitionCache => partitionCache && partitionCache.mesh !== null)
      .map(partitionCache => partitionCache.index);
  }

  gotPartition(geo: PartitionGeometryResult, pindex: number) {
    let partitionCache = this.partitionCaches[pindex];

    if (partitionCache && partitionCache.mesh) {
      this.scene.remove(partitionCache.mesh);

      partitionCache.mesh = null;
    }

    const bufferGeometry = new THREE.BufferGeometry();

    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(geo.data.position, 3));
    bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(geo.data.normal, 3));
    bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(geo.data.uv, 2));
    bufferGeometry.addAttribute('data', new THREE.BufferAttribute(geo.data.data, 4));
    bufferGeometry.addAttribute('offset', new THREE.BufferAttribute(geo.data.offset, 1));

    bufferGeometry.computeBoundingSphere();
    bufferGeometry.computeBoundingBox();

    const mesh = this.getMesh(bufferGeometry, geo.offset);

    partitionCache = {
      index: pindex,
      mesh,
      visible: true,
      used: Date.now()
    };

    this.partitionCaches[pindex] = partitionCache;

    this.scene.add(partitionCache.mesh);

    // // console.log('Visible Partitions:', this.getVisiblePartitionIndices().length);
  }

  removePartition(pindex: number) {
    const partitionCache = this.partitionCaches[pindex];

    if (!partitionCache) return;

    this.scene.remove(partitionCache.mesh);

    partitionCache.visible = false;

    // this.partitionCaches[partitionIndex] = null;

    return Promise.resolve(null);
  }

  exposeNewPartitions(changes: { toBeAdded: number[], toBeRemoved: number[] }) {
    if (this.loading) {
      // console.log('Still loading...');
      return null;
    }

    this.loading = true;

    return Promise.resolve().then(() => {
      return Promise.all(changes.toBeAdded.map(pindex => this.addPartition(pindex)));
    }).then(() => {
      return Promise.all(changes.toBeRemoved.map(pindex => this.removePartition(pindex)));
    }).then(() => {
      if (changes.toBeAdded.length || changes.toBeRemoved.length) {
        const loaded = this.partitionCaches.filter(partitionCache => !!partitionCache.mesh);
        const visible = this.partitionCaches.filter(partitionCache => partitionCache.visible);

        // console.log('loaded', loaded.length, 'visible', visible.length);

        const loadedPartition = this.partitionCaches.filter(c => !!c.mesh);

        if (loadedPartition.length > MaxLoadedPartitions) {
          _.sortBy(loadedPartition, 'used').forEach((partitionCache, i) => {
            if (i < loadedPartition.length - MaxLoadedPartitions && !partitionCache.visible) {
              partitionCache.mesh = null;
              // console.log('Cleaned', partitionCache.index, i);
            }
          });
        }
      }

      this.loading = false;
    }).catch(() => {
      this.loading = false;
    });
  }

  addSky() {
    const geometry = new THREE.PlaneBufferGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xbbccff, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);

    plane.position.x = this.worldInfo.worldDimensionsInBlocks.x / 2;
    plane.position.y = 128;
    plane.position.z = this.worldInfo.worldDimensionsInBlocks.z / 2;

    plane.rotation.x = Math.PI / 2;

    plane.scale.x = (this.worldInfo.worldDimensionsInBlocks.x * 100);
    plane.scale.y = (this.worldInfo.worldDimensionsInBlocks.z * 100);

    this.scene.add(plane);
  }
}
