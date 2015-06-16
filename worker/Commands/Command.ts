/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import part from '../Partition';
import com from '../Common';

module Command {
  export interface Command {
    getAffectedPartitionIndices(): number[];
    redo(partition: part.Partition): void;
    undo(partition: part.Partition): void;
  }  
}

export default Command;
