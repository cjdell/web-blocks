function WorldGeometry(world) {
  var partitionGeometries = new Array(world.getPartitionCapacity());

  function getPartitionGeometry(partitionIndex) {
    //console.log('getPartitionGeometry', partitionIndex);

    var partitionGeometry = partitionGeometries[partitionIndex];

    if (!partitionGeometry) {
      var partition = world.getPartitionByIndex(partitionIndex);

      partitionGeometry = new PartitionGeometry(partition);

      partitionGeometries[partitionIndex] = partitionGeometry;
    }

    partitionGeometry.consumeChanges();

    return {
      data: partitionGeometry.getData(),
      offset: partitionGeometry.getOffset()
    };
  }

  return {
    getPartitionGeometry: getPartitionGeometry
  };
}
