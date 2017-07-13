import React = require('react');
import { BoundScripts } from '../common/Types';

interface BoundScriptBarProps {
  scripts: BoundScripts;
  onExecuteBoundScript: (key: number) => void;
}

class BoundScriptBar extends React.Component<BoundScriptBarProps, any> {
  render() {
    return (
      <div className="boundScriptBar">
        <ul>
          {this.props.scripts.map(script => {
            return (
              <li key={script}>
                <a onClick={() => this.props.onExecuteBoundScript(script)} href="javascript:void(0)">
                  {script}
                </a>
              </li>
            );
          }) }
        </ul>
      </div>
    );
  }
}

export = BoundScriptBar;
