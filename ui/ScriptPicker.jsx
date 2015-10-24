var React = require('react');
var mui = require('material-ui');

var List = mui.List;
var ListItem = mui.ListItem;
var ListDivider = mui.ListDivider;
var Avatar = mui.Avatar;

var ScriptPicker = React.createClass({
  getInitialState: function() {
    return { visible: false };
  },
  scriptClick: function(name) {
    this.props.onScriptChosen(name);
  },
  render: function() {
    var lis = this.props.scriptStorage.getScripts().map(function(script, index) {
      return <ListItem key={index} primaryText={script.name} onTouchTap={this.scriptClick.bind(this, script.name)} />
    }, this);

    return (
    <div className={'scriptPicker ' + (this.props.visible ? 'show' : 'hide')}>
      <List>
        {lis}
      </List>
    </div>
    );
  }
});

module.exports = ScriptPicker;
