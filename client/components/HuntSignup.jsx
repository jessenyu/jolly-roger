import React from 'react';
import BS from 'react-bootstrap';
import ReactRouter from 'react-router';
import { huntFixtures } from '/imports/fixtures.js';
// TODO: ReactMeteorData
// TODO: JRPropTypes

HuntSignup = React.createClass({
  mixins: [ReactMeteorData],

  propTypes: {
    huntId: React.PropTypes.string.isRequired,
  },

  contextTypes: {
    history: ReactRouter.PropTypes.history,
    subs: JRPropTypes.subs,
  },

  getInitialState() {
    return {
      submitState: 'idle',
    };
  },

  getMeteorData() {
    if (_.has(huntFixtures, this.props.huntId)) {
      return {
        ready: true,
        hunt: huntFixtures[this.props.huntId],
      };
    }

    const handle = this.context.subs.subscribe('mongo.hunts', {_id: this.props.huntId});
    return {
      ready: handle.ready(),
      hunt: Models.Hunts.findOne(this.props.huntId),
    };
  },

  dismissAlert() {
    this.setState({
      submitState: 'idle',
      error: null,
    });
  },

  submit() {
    this.setState({submitState: 'submitting'});
    Meteor.call('joinHunt', this.props.huntId, (error) => {
      if (error) {
        this.setState({submitState: 'error', error});
      } else {
        this.setState({submitState: 'success'});
      }
    });
  },

  render() {
    if (this.data.ready) {
      const disable = this.state.submitState == 'submitting';
      return (
        <div>
          <BS.Alert bsStyle="warning">
            You haven't signed up for this hunt yet. Are you going to
            participate in {this.data.hunt.name}?
          </BS.Alert>
          {this.state.submitState === 'error' ? (
             <BS.Alert bsStyle="danger" onDismiss={this.dismissAlert}>
               Saving failed: {this.state.error.message}
             </BS.Alert>
           ) : null}
          <BS.ButtonToolbar>
            <BS.Button bsStyle="default" onClick={this.context.history.goBack} disabled={disable}>
              Whoops! Nope, get me out of here
            </BS.Button>
            <BS.Button bsStyle="primary" onClick={this.submit} disabled={disable}>
              Yep! Join this hunt
            </BS.Button>
          </BS.ButtonToolbar>
        </div>
      );
    } else {
      return <span>loading...</span>;
    }
  },
});
