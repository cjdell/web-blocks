import { Tool, Context } from './ToolBase';
import CuboidTool from './CuboidTool';
import BlockTool from './BlockTool';

type ToolDefinition = {
  type: string,
  name: string,
  icon: string,
  class: { new (context: Context): Tool }
};

const Tools: ToolDefinition[] = [
  {
    type: 'block',
    name: 'Single',
    icon: 'textures/tool-block.png',
    class: BlockTool
  },
  {
    type: 'cuboid',
    name: 'Multi',
    icon: 'textures/tool-cuboid.png',
    class: CuboidTool
  }
];

export default Tools;
