import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Relay from 'react-relay/classic';
import { FormattedMessage, injectIntl } from 'react-intl';
import { ListItem } from 'material-ui/List';
import FlatButton from 'material-ui/FlatButton';
import FASlack from 'react-icons/lib/fa/slack';
import FAFacebook from 'react-icons/lib/fa/facebook-official';
import FATwitter from 'react-icons/lib/fa/twitter';
import rtlDetect from 'rtl-detect';
import ConfirmDialog from '../layout/ConfirmDialog';
import UserDisconnectLoginAccountMutation from '../../relay/mutations/UserDisconnectLoginAccountMutation';
import { login } from '../../redux/actions';
import {
  FlexRow,
  Text,
  slackGreen,
  twitterBlue,
  facebookBlue,
} from '../../styles/js/shared';

class UserConnectedAccount extends Component {
  static renderLabel(userAction) {
    switch (userAction) {
    case 'connect':
      return <FormattedMessage id="UserConnectedAccount.connectButton" defaultMessage="Connect" />;
    case 'disconnect':
      return <FormattedMessage id="UserConnectedAccount.disconnectButton" defaultMessage="Disconnect" />;
    default:
      return null;
    }
  }

  constructor(props) {
    super(props);
    this.state = { dialogOpen: false };
  }

  handleOpenDialog() {
    this.setState({ dialogOpen: true });
  }

  handleCloseDialog() {
    this.setState({ dialogOpen: false });
  }

  handleUserClick(userAction) {
    if (userAction === 'connect') {
      login(this.props.provider.key, this.props.loginCallback);
    } else if (userAction === 'disconnect') {
      this.handleRequestDisconnectAccount();
      this.setState({ dialogOpen: false });
    }
  }

  handleRequestDisconnectAccount() {
    const onFailure = () => {
    };
    const onSuccess = () => {
    };
    const { provider } = this.props;
    Relay.Store.commitUpdate(
      new UserDisconnectLoginAccountMutation({
        provider,
      }),
      { onSuccess, onFailure },
    );
  }

  socialIcon() {
    switch (this.props.provider.key) {
    case 'twitter':
      return <FATwitter style={{ color: twitterBlue }} className="logo" />;
    case 'slack':
      return <FASlack style={{ color: slackGreen }} className="logo" />;
    case 'facebook':
      return <FAFacebook style={{ color: facebookBlue }} className="logo" />;
    default:
      return null;
    }
  }

  render() {
    const { provider } = this.props;

    const userAction = (provider.connected === true) ? 'disconnect' : 'connect';

    let disableDisconnect = false;
    if (userAction === 'disconnect' && provider.allow_disconnect === false) {
      disableDisconnect = true;
    }

    const isRtl = rtlDetect.isRtlLang(this.props.intl.locale);

    const direction = {
      from: isRtl ? 'right' : 'left',
      to: isRtl ? 'left' : 'right',
    };

    const buttonStyle = {
      minWidth: 350,
      textAlign: direction.to,
    };

    const confirmDialog = {
      title: <FormattedMessage
        id="UserConnectedAccount.disconnectAccountTitle"
        defaultMessage="Disconnect account"
      />,
      blurb: <FormattedMessage
        id="UserConnectedAccount.disconnectAccountConfirmationText"
        defaultMessage="Are you sure? This will disconnect login account."
      />,
    };

    return (
      <ListItem
        className="team-connected_accounts"
        key={provider.key}
        disabled
        leftIcon={this.socialIcon()}
        style={{ padding: '8px 61px' }}
      >
        <FlexRow>
          <Text ellipsis>
            {provider.key} {provider.info}
          </Text>
          <FlatButton
            hoverColor="transparent"
            style={buttonStyle}
            label={UserConnectedAccount.renderLabel(userAction)}
            primary
            onClick={userAction === 'connect' ? this.handleUserClick.bind(this, userAction) : this.handleOpenDialog.bind(this)}
            className="team-connect-account-button--disconnect"
            disabled={disableDisconnect}
          />
          <ConfirmDialog
            open={this.state.dialogOpen}
            title={confirmDialog.title}
            blurb={confirmDialog.blurb}
            handleClose={this.handleCloseDialog.bind(this)}
            handleConfirm={this.handleUserClick.bind(this, userAction)}
          />
        </FlexRow>
      </ListItem>
    );
  }
}
UserConnectedAccount.contextTypes = {
  store: PropTypes.object,
};
export default injectIntl(UserConnectedAccount);
