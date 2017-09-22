import React, { Component } from 'react';
import MenuItem from 'material-ui/MenuItem';
import { Link } from 'react-router';
import Divider from 'material-ui/Divider';
import Drawer from 'material-ui/Drawer';
import { FormattedMessage } from 'react-intl';
import IconButton from 'material-ui/IconButton';
import styled from 'styled-components';
import { stringHelper } from '../customHelpers';
import UserMenuItems from './UserMenuItems';
import UserAvatarRelay from '../relay/UserAvatarRelay';
import {
  Text,
  Row,
  Offset,
  HeaderTitle,
  subheading2,
  black87,
  white,
  black05,
  black54,
  units,
  boxShadow,
  caption,
  avatarSize,
  avatarStyle,
  body2,
} from '../styles/js/shared';

class DrawerNavigation extends Component {

  render() {
    const {team, loggedIn} = this.props;
    const drawerTopOffset = units(6.5);
    const drawerHeaderHeight = units(14);

    const styles = {
      drawerFooter: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: white,
        padding: `${units(2)}`,
      },
      drawerFooterLink: {
        font: caption,
      },
      drawerProjects: {
        overflow: 'auto',
        marginBottom: 'auto',
      },
      drawerProjectsAndFooter: {
        display: 'flex',
        flexDirection: 'column',
        height: `calc(100vh - ${drawerHeaderHeight})`,
      },
      drawerYourProfileButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: units(4),
        height: units(4),
        padding: 0,
        margin: `0 ${units(1)}`,
      },
    };

    const DrawerHeader = styled.div`
      height: ${drawerHeaderHeight};
      background-color: ${black05};
      padding: ${units(2)};
    `;

    // Team Avatar
    const TeamAvatar = styled.div`
      ${avatarStyle}
      background-image: url(${team.avatar});
      width: ${props => props.size ? props.size : avatarSize};
      height: ${props => props.size ? props.size : avatarSize};
    `;

    const Headline = styled(HeaderTitle)`
      font: ${body2};
      font-weight: 700;
      padding-top: ${units(1)};
      color: ${black54};
    `;

    const SubHeading = styled.div`
      font: ${caption};
      color: ${black54};
      padding: ${units(2)} ${units(2)} ${units(1)} ${units(2)};
    `;

    const TosMenuItem = (
      <a
        style={styles.drawerFooterLink}
        target="_blank"
        rel="noopener noreferrer"
        href={stringHelper('TOS_URL')}
        onClick={this.props.drawerToggle}
      >
        <FormattedMessage
          id="headerActions.tos"
          defaultMessage="Terms"
        />
      </a>
    );

    const privacyMenuItem = (
      <a
        style={styles.drawerFooterLink}
        target="_blank"
        rel="noopener noreferrer"
        href={stringHelper('PP_URL')}
        onClick={this.props.drawerToggle}
      >
        <FormattedMessage
          id="headerActions.privacyPolicy"
          defaultMessage="Privacy"
        />
      </a>
    );

    const aboutMenuItem = (
      <a
        style={styles.drawerFooterLink}
        target="_blank"
        rel="noopener noreferrer"
        href={stringHelper('ABOUT_URL')}
        onClick={this.props.drawerToggle}
      >
        <FormattedMessage
          id="headerActions.about"
          defaultMessage="About"
        />
      </a>
    );

    const contactMenuItem = (
      <a
        style={styles.drawerFooterLink}
        target="_blank"
        rel="noopener noreferrer"
        href={stringHelper('CONTACT_HUMAN_URL')}
        onClick={this.props.drawerToggle}
      >
        <FormattedMessage
          id="headerActions.contactHuman"
          defaultMessage="Contact"
        />
      </a>
    );

    const yourProfileButton = (
      <Link to="/check/teams" onClick={this.props.drawerToggle}>
        <IconButton style={styles.drawerYourProfileButton}
          tooltip={<FormattedMessage id="drawerNavigation.userTeams" defaultMessage="Your Teams" /> }
          tooltipPosition="bottom-center"
        >
          <UserAvatarRelay size={units(4)} {...this.props} />
        </IconButton>
      </Link>
    );

    const projectList = this.props.team.projects.edges
      .sortp((a, b) => a.node.title.localeCompare(b.node.title))
      .map((p) => {
        const projectPath = `/${this.props.team.slug}/project/${p.node.dbid}`;

        return (
          <Link to={projectPath} onClick={this.props.drawerToggle}>
            <MenuItem key={p.node.dbid} primaryText={<Text ellipsis>{p.node.title}</Text>}></MenuItem>
          </Link>
        );
      });

    return (
      <Drawer {...this.props}>
        <DrawerHeader>
          <Row style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <TeamAvatar size={units(7)} />
            <Offset>
              { loggedIn && yourProfileButton }
            </Offset>
          </Row>

          <Link
            className="team-header__drawer-team-link"
            to={`/${this.props.team.slug}/`}
            onClick={this.props.drawerToggle}
          >
            <Headline>{team.name}</Headline>
          </Link>
        </DrawerHeader>

        <Divider />
        <div style={styles.drawerProjectsAndFooter}>
          <div style={styles.drawerProjects}>
            <SubHeading>
              <FormattedMessage
                id="drawerNavigation.projectsSubheading"
                defaultMessage="Projects"
              />
            </SubHeading>
            {projectList}
          </div>

          <div>
            <UserMenuItems hideContactMenuItem {...this.props} />
          </div>

          <div style={styles.drawerFooter}>
            {TosMenuItem}
            {privacyMenuItem}
            {aboutMenuItem}
            {contactMenuItem}
          </div>
        </div>
      </Drawer>
    );
  }
}

export default DrawerNavigation;
