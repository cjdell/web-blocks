var React = require('react');

var ScriptPicker = React.createClass({
  getInitialState: function() {
    return { visible: false };
  },
  scriptClick: function(name) {
    this.props.onScriptChosen(name);
  },
  render: function() {
    var lis = this.props.scriptStorage.getScriptNames().map(function(name) {
      return <li onClick={this.scriptClick.bind(this, name)}>{name}</li>;
    }, this);

    return (
    <div className={'scriptPicker ' + (this.props.visible ? 'show' : 'hide')}>
      <ul>
        {lis}
      </ul>
    </div>
    );
  }
});

module.exports = ScriptPicker;
