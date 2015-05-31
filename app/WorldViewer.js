function WorldViewer(scene, worldInfo, shaderMaterial, workerInterface) {
  var partitionCaches = null;

  init();

  function init() {
    partitionCaches = new Array(worldInfo.partitionCapacity);

    addSky();
  }

  function getMesh(bufferGeometry, offset) {
    var mesh = new THREE.Mesh(bufferGeometry, shaderMaterial);

    mesh.position.x += offset.x + 8;
    mesh.position.y += offset.y + 16;
    mesh.position.z += offset.z + 8;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  function addPartition(partitionIndex) {
    console.time('addPartition' + partitionIndex);

    var partitionCache = partitionCaches[partitionIndex];

    if (!partitionCache) return workerInterface.getPartition(partitionIndex).then(gotPartition);

    scene.add(partitionCache.mesh);
  }

  function updatePartition(partitionIndex) {
    console.time('updatePartition' + partitionIndex);

    workerInterface.getPartition(partitionIndex).then(gotPartition);
  }

  workerInterface.addChangeListener(function(data) {
    var changeIndices = data.changes;
    var visibleIndices = getVisiblePartitionIndices();

    //console.log('changeIndices', changeIndices);
    //console.log('visibleIndices', visibleIndices);

    var toUpdate = _.intersection(changeIndices, visibleIndices);

    console.log('toUpdate', toUpdate);

    toUpdate.forEach(function(index) {
      updatePartition(index);
    });
  });

  function getVisiblePartitionIndices() {
    return partitionCaches
    .filter(function(partitionCache) {
      return partitionCache.mesh;
    })
    .map(function(partitionCache) {
      return partitionCache.index;
    });
  }

  function gotPartition(data) {
    var geo = data.geo, partitionIndex = data.index;

    var partitionCache = partitionCaches[partitionIndex];

    if (partitionCache) {
      scene.remove(partitionCache.mesh);

      partitionCache.mesh = null;
    }

    var bufferGeometry = new THREE.BufferGeometry();

    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(geo.data.position, 3));
    bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(geo.data.normal, 3));
    bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(geo.data.uv, 2));
    bufferGeometry.addAttribute('data', new THREE.BufferAttribute(geo.data.data, 1));
    bufferGeometry.addAttribute('offset', new THREE.BufferAttribute(geo.data.offset, 1));

    bufferGeometry.computeBoundingSphere();
    bufferGeometry.computeBoundingBox();

    var mesh = getMesh(bufferGeometry, geo.offset);

    partitionCache = {
      index: partitionIndex,
      mesh: mesh
    };

    partitionCaches[partitionIndex] = partitionCache;

    scene.add(partitionCache.mesh);

    console.timeEnd('addPartition' + partitionIndex);
    console.timeEnd('updatePartition' + partitionIndex);
  }

  function removePartition(partitionIndex) {
    var partitionCache = partitionCaches[partitionIndex];

    if (!partitionCache) return;

    scene.remove(partitionCache.mesh);
  }

  function exposeNewPartitions(changes) {
    changes.toBeAdded.forEach(function(partitionIndex) {
      console.log('toBeAdded', partitionIndex);
      addPartition(partitionIndex);
    });

    changes.toBeRemoved.forEach(function(partitionIndex) {
      removePartition(partitionIndex);
    });
  }

  function addSky() {
    var geometry = new THREE.PlaneGeometry(1, 1);
    var material = new THREE.MeshBasicMaterial({ color: 0xbbccff, side: THREE.DoubleSide });
    var plane = new THREE.Mesh(geometry, material);

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

module.exports = WorldViewer;
