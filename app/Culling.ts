/// <reference path="../typings/tsd.d.ts" />
import _ = require('underscore');
import THREE = require('three');

module Culling {
  export function NewCulling(camera:THREE.Camera, worldInfo:any) {
    var active = <[number]>[];
  
    function getVisiblePartitions():[number] {
      camera.updateMatrix(); // make sure camera's local matrix is updated
      camera.updateMatrixWorld(false); // make sure camera's world matrix is updated
      camera.matrixWorldInverse.getInverse(camera.matrixWorld);
  
      var frustum = new THREE.Frustum();
  
      frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  
      return worldInfo.partitionBoundaries.filter(function(partition:any) {
        var visible = false;
  
        partition.points.forEach(function(boundaryPoint:any) {
          var cam2d = new THREE.Vector2(camera.position.x, camera.position.z);
          var point = new THREE.Vector2(boundaryPoint.x, boundaryPoint.z);
  
          //if (camera.position.distanceTo(boundaryPoint) < 16) {
  
          var dist = cam2d.distanceTo(point);
  
          if (dist < 96) {
            if (dist < 32) {
              // Immediate proximity
              visible = true;
              return;
            }
  
            if (frustum.containsPoint(boundaryPoint)) {
              if (!visible) visible = true;
            }
          }
        });
  
        return visible;
      }).map(function(partition:any) {
        return partition.partitionIndex;
      });
    }
  
    function getNewlyVisiblePartitions() {
      var visiblePartitions = getVisiblePartitions();
  
      var toBeAdded = _.difference(visiblePartitions, active);
      var toBeRemoved = _.difference(active, visiblePartitions);
  
      active = visiblePartitions;
  
      return { toBeAdded: toBeAdded, toBeRemoved: toBeRemoved };
    }
  
    return {
      getVisiblePartitions: getVisiblePartitions,
      getNewlyVisiblePartitions: getNewlyVisiblePartitions
    };
  }
}

export default Culling;
