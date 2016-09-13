bindScript(function () {
  const pos = getPosition();

  const radius = 10;

  for (let x = -radius; x <= radius * 2; x += 1) {
    for (let y = -radius; y <= radius * 2; y += 1) {
      const r = Math.pow(x * x + y * y, 0.5);
      
      if (r >= radius - 1 && r <= radius) { 
        setBlock(pos.x - x, pos.y + y + radius, pos.z, Stone);
      }

      if (r < radius - 1) {
        setBlock(pos.x - x, pos.y + y + radius, pos.z, Water);
      }
    }
  }

  setInterval(function() {
    const newPos = getPosition();
    
    const r = Math.pow(
      Math.pow(newPos.x - pos.x, 2) + 
      Math.pow(newPos.y - (pos.y + radius), 2), 
    0.5);
    
    if (r < radius && 
      newPos.z > (pos.z - 2) && 
      newPos.z < (pos.z + 2)) {
      setPosition(newPos.x, newPos.y + 30, newPos.z);
    }
  }, 20);
}, 5);
