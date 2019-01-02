import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import React from 'react';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import Nav from 'react-bootstrap/lib/Nav';
import NavDropdown from 'react-bootstrap/lib/NavDropdown';
import Navbar from 'react-bootstrap/lib/Navbar';
import { Link } from 'react-router';
import RRBS from 'react-router-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import subsCache from '../subsCache.js';
import ConnectionStatus from './ConnectionStatus.jsx';
import NotificationCenter from './NotificationCenter.jsx';
import navAggregatorType from './navAggregatorType.jsx';
import Profiles from '../../lib/models/profiles.js';

class SharedNavbar extends React.Component {
  static propTypes = {
    userId: PropTypes.string,
    displayName: PropTypes.string.isRequired,
  };

  static contextTypes = {
    navAggregator: navAggregatorType,
  };

  logout = () => {
    Meteor.logout();
  };

  render() {
    return (
      <Navbar fixedTop fluid>
        <Navbar.Header>
          <Navbar.Brand>
            <Link to="/">
              <img src="/images/brand.png" alt="Jolly Roger logo" />
            </Link>
          </Navbar.Brand>
          <this.context.navAggregator.NavBar />
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          <Nav pullRight>
            <NavDropdown
              id="profileDropdown"
              title={this.props.displayName}
            >
              <RRBS.LinkContainer to={`/users/${this.props.userId}`}>
                <MenuItem eventKey="1">My Profile</MenuItem>
              </RRBS.LinkContainer>
              <MenuItem eventKey="2" href="mailto:dfa-web@mit.edu">
                Report an issue
              </MenuItem>
              <MenuItem eventKey="3" onSelect={this.logout}>Sign out</MenuItem>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

const SharedNavbarContainer = withTracker(() => {
  const userId = Meteor.userId();
  const profileSub = subsCache.subscribe('mongo.profiles', { _id: userId });
  const profile = Profiles.findOne(userId);
  const displayName = profileSub.ready() ?
    ((profile && profile.displayName) || '<no name given>') : 'loading...';
  return {
    userId,
    displayName,
  };
})(SharedNavbar);

class FullscreenLayout extends React.Component {
  static propTypes = {
    children: PropTypes.node,
  };

  render() {
    const { children, ...props } = this.props;
    return (
      <div>
        <NotificationCenter />
        <SharedNavbarContainer {...props} />
        <div className="connection-status-fullscreen">
          <ConnectionStatus />
        </div>
        <div className="app-content-fullscreen">
          {children}
        </div>
      </div>
    );
  }
}

class ScrollableLayout extends React.Component {
  static propTypes = {
    children: PropTypes.node,
  };

  render() {
    const { children, ...props } = this.props;
    return (
      <div>
        <NotificationCenter />
        <SharedNavbarContainer {...props} />
        <div className="container-fluid app-content-scrollable">
          <ConnectionStatus />
          {children}
        </div>
      </div>
    );
  }
}

class App extends React.Component {
  static propTypes = {
    routes: PropTypes.array,
  };

  render() {
    // Hack: see if the leaf route wants the fullscreen layout.
    const { routes, ...props } = this.props;
    const leafRoute = routes[routes.length - 1];
    const layout = leafRoute.component.desiredLayout;
    return (
      layout === 'fullscreen' ?
        <FullscreenLayout {...props} /> :
        <ScrollableLayout {...props} />
    );
  }
}

export default App;
