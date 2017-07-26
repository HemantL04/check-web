import React, { Component } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router';
import CheckContext from '../../CheckContext';
import {
  defaultBorderRadius,
  subheading2,
  ellipsisStyles,
  avatarStyle,
  units,
  white,
} from '../../styles/js/variables.js';

class TeamHeaderComponent extends Component {

  componentWillMount() {
    this.updateContext();
  }

  componentWillUpdate() {
    this.updateContext();
  }

  updateContext() {
    new CheckContext(this).setContextStore({ team: this.props.team });
  }

  render() {
    const team = this.props.team;
    const isProjectUrl = /(.*\/project\/[0-9]+)/.test(window.location.pathname);

    const TeamLink = styled(Link)`
      align-items: center;
      display: flex;
      height: 100%;
      overflow: hidden;
      width: 100%;

      &,
      &:hover {
        text-decoration: none;
      }

      &,
      &:visited {
        color: inherit;
      }
    `;

    const TeamNav = styled.nav`
      border-radius: ${defaultBorderRadius};
      display: flex;
      height: ${units(6)};
      overflow: hidden;
    `;

    const TeamName = styled.h3`
      ${ellipsisStyles}
      font: ${subheading2};
      margin-left: ${units(3)};
    `;

    const TeamAvatar = styled.div`
      ${avatarStyle}
      background-image: url(${team.avatar});
      background-color: ${white};
      margin: 0;
      width: ${units(5)};
      height: ${units(5)};
      margin-left: ${units(2)};
    `;

    return (
      <TeamNav>
        <TeamLink to={`/${team.slug}`} title={team.name} className="team-header__avatar">
          <TeamAvatar />
          {isProjectUrl ? null : <TeamName>{team.name}</TeamName>}
        </TeamLink>
      </TeamNav>
    );
  }
}

TeamHeaderComponent.contextTypes = {
  store: React.PropTypes.object,
};

export default TeamHeaderComponent;
