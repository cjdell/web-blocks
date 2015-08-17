/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import Partition from '../Partition';
import com from '../../common/Common';

export interface Command {
  getAffectedPartitionIndices(): number[];
  redo(partition: Partition): void;
  undo(partition: Partition): void;
}

export default Command;
