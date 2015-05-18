function BlockTypeList() {
  var blockTypes = [{
    name: 'Air',
    textures: {
      top: null,
      side: null
    }
  }, {
    name: 'Stone',
    textures: {
      top: 'textures/stone.png',
      side: 'textures/stone.png'
    }
  }, {
    name: 'Grass',
    textures: {
      top: 'textures/grass.png',
      side: 'textures/grass_dirt.png'
    }
  }, {
    name: 'Water',
    textures: {
      top: 'textures/water.png',
      side: 'textures/water.png'
    }
  }, {
    name: 'Sky',
    textures: {
      top: 'textures/sky.png',
      side: 'textures/sky.png'
    }
  }];

  function getImage(src) {
    return new Promise(function(resolve, reject) {
      var image = new Image();

      image.onload = function() {
        return resolve(image);
      };

      image.onerror = function() {
        return reject();
      };

      image.src = src;
    });
  }

  function getBlockTexture() {
    var canvas = document.createElement('canvas');

    var typeCount = 8;

    canvas.width = typeCount * 16;
    canvas.height = typeCount * 16;

    var ctx = canvas.getContext('2d');

    var blockTypePromises = blockTypes.map(function(blockType, index) {
      if (index === 0) return null;

      var top = getImage(blockType.textures.top);
      var side = getImage(blockType.textures.side);

      return Promise.all([top, side]).then(function(results) {
        var top = results[0], side = results[1];

        ctx.drawImage(top, 0, (typeCount - index - 1) * 16, 16, 16);
        ctx.drawImage(side, 16, (typeCount - index - 1) * 16, 16, 16);
      });
    });

    return Promise.all(blockTypePromises).then(function() {
      var texture = new THREE.Texture(canvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.LinearMipMapLinearFilter);
      texture.needsUpdate = true;
      return texture;
    });
  }

  function getBlockTypes() {
    return blockTypes;
  }

  return {
    getBlockTexture: getBlockTexture,
    getBlockTypes: getBlockTypes
  };
}

module.exports = BlockTypeList;
