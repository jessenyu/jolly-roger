/* eslint-disable max-len */
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { _ } from 'meteor/underscore';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons/faSkullCrossbones';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Flags from '../../flags';
import { calendarTimeFormat } from '../../lib/calendarTimeFormat';
import Announcements from '../../lib/models/announcements';
import ChatNotifications from '../../lib/models/chat_notifications';
import Guesses from '../../lib/models/guesses';
import Hunts from '../../lib/models/hunts';
import PendingAnnouncements from '../../lib/models/pending_announcements';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { deprecatedIsActiveOperator } from '../../lib/permission_stubs';
import { AnnouncementType } from '../../lib/schemas/announcement';
import { ChatNotificationType } from '../../lib/schemas/chat_notification';
import { GuessType } from '../../lib/schemas/guess';
import { HuntType } from '../../lib/schemas/hunt';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { guessURL } from '../../model-helpers';
import { requestDiscordCredential } from '../discord';
import useSubscribeDisplayNames from '../hooks/use-subscribe-display-names';
import markdown from '../markdown';
import Breakable from './styling/Breakable';

const StyledDismissButton = styled.button`
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  font-size: 20px;
  font-weight: bold;
  right: 0px;
  top: 0px;
  color: #888;
  &:hover {
    color: #f0f0f0;
  }
`;

const StyledNotificationMessage = styled.li`
  width: 100%;
  position: relative;
  background-color: #404040;
  color: #f0f0f0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: flex-start;
  overflow: hidden;

  &:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #595959;
  }

  &:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const StyledNotificationActionBar = styled.ul`
  display: block;
  list-style-type: none;
  margin: 0px;
  padding: 0px;
  display: flex;
  flex-direction: row;
`;

const StyledNotificationActionItem = styled.li`
  margin-left: 0px;
  margin-top: 8px;
  margin-right: 8px;
  margin-bottom: 4px;
  display: inline-block;

  a, button {
    display: inline-block;
    border: none;
    padding: 4px 10px;
    border-radius: 4px;
    background-color: #2e2e2e;
    color: #aaaaaa;
    &:hover {
      color: #f0f0f0;
      cursor: pointer;
      text-decoration: none;
    }
  }
`;

interface MessengerDismissButtonProps {
  onDismiss: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const MessengerDismissButton = React.memo((props: MessengerDismissButtonProps) => {
  return <StyledDismissButton type="button" onClick={props.onDismiss}>×</StyledDismissButton>;
});

const MessengerContent = styled.div`
  overflow-x: hidden; // overflow-wrap on children just overflows the box without this
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 10px;
  padding-bottom: 10px;
`;

const StyledSpinnerBox = styled.div`
  background-color: #292929;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 55px;
  flex: 0 0 55px;
`;

const StyledSpinner = styled.div`
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  background-color: #61c4b8;
`;

const MessengerSpinner = React.memo(() => {
  return (
    <StyledSpinnerBox>
      <StyledSpinner />
    </StyledSpinnerBox>
  );
});

interface GuessMessageProps {
  guess: GuessType;
  puzzle: PuzzleType;
  hunt: HuntType;
  guesser: string;
  onDismiss: (guessId: string) => void;
}

const GuessMessage = React.memo((props: GuessMessageProps) => {
  const {
    guess, puzzle, hunt, guesser, onDismiss,
  } = props;

  const markCorrect = useCallback(() => {
    Meteor.call('markGuessCorrect', guess._id);
  }, [guess._id]);

  const markIncorrect = useCallback(() => {
    Meteor.call('markGuessIncorrect', guess._id);
  }, [guess._id]);

  const markRejected = useCallback(() => {
    Meteor.call('markGuessRejected', guess._id);
  }, [guess._id]);

  const dismissGuess = useCallback(() => {
    onDismiss(guess._id);
  }, [onDismiss, guess._id]);

  const directionTooltip = (
    <Tooltip id="direction-tooltip">
      Direction this puzzle was solved, ranging from completely backsolved (-10) to completely forward solved (10)
    </Tooltip>
  );
  const confidenceTooltip = (
    <Tooltip id="confidence-tooltip">
      Submitter-estimated likelihood that this answer is correct
    </Tooltip>
  );
  const copyTooltip = (
    <Tooltip id="copy-tooltip">
      Copy to clipboard
    </Tooltip>
  );
  const jrLinkTooltip = (
    <Tooltip id="jr-link-tooltip">
      Open Jolly Roger page
    </Tooltip>
  );
  const extLinkTooltip = (
    <Tooltip id="ext-link-tooltip">
      Open puzzle
    </Tooltip>
  );

  const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;

  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <div>
          Guess for
          {' '}
          {puzzle.title}
          {' '}
          from
          {' '}
          <Breakable>{guesser}</Breakable>
          :
          {' '}
          <Breakable>{guess.guess}</Breakable>
        </div>
        <div>
          <OverlayTrigger placement="bottom" overlay={directionTooltip}>
            <span>
              Solve direction:
              {' '}
              {guess.direction}
            </span>
          </OverlayTrigger>
        </div>
        <div>
          <OverlayTrigger placement="bottom" overlay={confidenceTooltip}>
            <span>
              Confidence:
              {' '}
              {guess.confidence}
              %
            </span>
          </OverlayTrigger>
        </div>
        <StyledNotificationActionBar>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={copyTooltip}>
              <CopyToClipboard text={guess.guess}>
                <button type="button" aria-label="Copy"><FontAwesomeIcon icon={faCopy} /></button>
              </CopyToClipboard>
            </OverlayTrigger>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={jrLinkTooltip}>
              <a href={linkTarget} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faSkullCrossbones} />
              </a>
            </OverlayTrigger>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={extLinkTooltip}>
              <a href={guessURL(hunt, puzzle)} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faPuzzlePiece} />
              </a>
            </OverlayTrigger>
          </StyledNotificationActionItem>
        </StyledNotificationActionBar>
        <StyledNotificationActionBar>
          <StyledNotificationActionItem><button type="button" onClick={markCorrect}>Correct</button></StyledNotificationActionItem>
          <StyledNotificationActionItem><button type="button" onClick={markIncorrect}>Incorrect</button></StyledNotificationActionItem>
          <StyledNotificationActionItem><button type="button" onClick={markRejected}>Reject</button></StyledNotificationActionItem>
        </StyledNotificationActionBar>
      </MessengerContent>
      <MessengerDismissButton onDismiss={dismissGuess} />
    </StyledNotificationMessage>
  );
});

interface DiscordMessageProps {
  onDismiss: () => void;
}

enum DiscordMessageStatus {
  IDLE = 'idle',
  LINKING = 'linking',
  ERROR = 'error',
  SUCCESS = 'success',
}

type DiscordMessageState = {
  status: DiscordMessageStatus;
  error?: string;
}

const DiscordMessage = React.memo((props: DiscordMessageProps) => {
  const [state, setState] = useState<DiscordMessageState>({ status: DiscordMessageStatus.IDLE });

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setState({ status: DiscordMessageStatus.IDLE });
      return;
    }

    Meteor.call('linkUserDiscordAccount', token, secret, (error?: Error) => {
      if (error) {
        setState({ status: DiscordMessageStatus.ERROR, error: error.message });
      } else {
        setState({ status: DiscordMessageStatus.IDLE });
      }
    });
  }, []);

  const initiateOauthFlow = useCallback(() => {
    setState({ status: DiscordMessageStatus.LINKING });
    requestDiscordCredential(requestComplete);
  }, [requestComplete]);

  const msg = 'It looks like you\'re not in our Discord server, which Jolly Roger manages access to.  Get added:';
  const actions = [
    <StyledNotificationActionItem key="invite">
      <button
        type="button"
        disabled={!(state.status === DiscordMessageStatus.IDLE || state.status === DiscordMessageStatus.ERROR)}
        onClick={initiateOauthFlow}
      >
        Add me
      </button>
    </StyledNotificationActionItem>,
  ];

  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        {msg}
        <StyledNotificationActionBar>
          {actions}
        </StyledNotificationActionBar>
        {state.status === DiscordMessageStatus.ERROR ? state.error! : null}
      </MessengerContent>
      <MessengerDismissButton onDismiss={props.onDismiss} />
    </StyledNotificationMessage>
  );
});

interface AnnouncementMessageProps {
  id: string;
  announcement: AnnouncementType;
  createdByDisplayName: string;
}

const AnnouncementMessage = React.memo((props: AnnouncementMessageProps) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const onDismiss = useCallback(() => {
    setDismissed(true);
    Meteor.call('dismissPendingAnnouncement', props.id);
  }, [props.id]);

  if (dismissed) {
    return null;
  }

  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: markdown(props.announcement.message) }}
        />
        <footer>
          {'- '}
          {props.createdByDisplayName}
          {', '}
          {calendarTimeFormat(props.announcement.createdAt)}
        </footer>
      </MessengerContent>
      <MessengerDismissButton onDismiss={onDismiss} />
    </StyledNotificationMessage>
  );
});

interface ProfileMissingMessageProps {
  onDismiss: () => void;
}
const ProfileMissingMessage = (props: ProfileMissingMessageProps) => {
  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        Somehow you don&apos;t seem to have a profile.  (This can happen if you wind
        up having to do a password reset before you successfully log in for the
        first time.)  Please set a display name for yourself via
        {' '}
        <Link to="/users/me">
          the profile page
        </Link>
        .
      </MessengerContent>
      <MessengerDismissButton onDismiss={props.onDismiss} />
    </StyledNotificationMessage>
  );
};

interface ChatNotificationMessageProps {
  cn: ChatNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
  senderDisplayName: string;
  onDismiss: (chatNotificationId: string) => void;
}
const ChatNotificationMessage = (props: ChatNotificationMessageProps) => {
  const { onDismiss } = props;
  const id = props.cn._id;
  const dismiss = useCallback(() => onDismiss(id), [id, onDismiss]);
  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <Link to={`/hunts/${props.hunt._id}/puzzles/${props.puzzle._id}`}>
          {props.puzzle.title}
        </Link>
        <div>
          {props.senderDisplayName}
          {': '}
          <div>
            {props.cn.text}
          </div>
        </div>
      </MessengerContent>
      <MessengerDismissButton onDismiss={dismiss} />
    </StyledNotificationMessage>
  );
};

const StyledNotificationCenter = styled.ul`
  position: fixed;
  width: 350px;
  top: 20px;
  right: 20px;
  margin: 0;
  padding: 0;
  z-index: 1050;
`;

const NotificationCenter = () => {
  const canUpdateGuesses = useTracker(() => deprecatedIsActiveOperator(Meteor.userId()));
  const pendingGuessesLoading = useSubscribe(canUpdateGuesses ? 'pendingGuesses' : undefined);

  // This is overly broad, but we likely already have the data cached locally
  const userId = useTracker(() => Meteor.userId()!);
  const selfProfileLoading = useSubscribe('mongo.profiles', { _id: userId });
  const displayNamesLoading = useSubscribeDisplayNames();
  const announcementsLoading = useSubscribe('mongo.announcements');
  // pending_announcements implicitly limits to the current user
  const pendingAnnouncementsLoading = useSubscribe('mongo.pending_announcements');

  const disableDingwords = useTracker(() => Flags.active('disable.dingwords'));
  const chatNotificationsLoading = useSubscribe(disableDingwords ? undefined : 'chatNotifications');

  const loading =
    pendingGuessesLoading() ||
    selfProfileLoading() ||
    displayNamesLoading() ||
    announcementsLoading() ||
    pendingAnnouncementsLoading() ||
    chatNotificationsLoading();

  const discordEnabledOnServer = useTracker(() => (
    !!ServiceConfiguration.configurations.findOne({ service: 'discord' }) && !Flags.active('disable.discord')
  ), []);
  const { hasOwnProfile, discordConfiguredByUser } = useTracker(() => {
    const ownProfile = Profiles.findOne(Meteor.userId()!);
    return {
      hasOwnProfile: !!(ownProfile),
      discordConfiguredByUser: !!(ownProfile && ownProfile.discordAccount),
    };
  }, []);

  // Lookup tables to support guesses/pendingAnnouncements/chatNotifications
  const hunts = useTracker(() => (loading ? {} : _.indexBy(Hunts.find().fetch(), '_id')), [loading]);
  const puzzles = useTracker(() => (loading ? {} : _.indexBy(Puzzles.find().fetch(), '_id')), [loading]);
  const displayNames = useTracker(() => (loading ? {} : Profiles.displayNames()), [loading]);
  const announcements = useTracker(() => (loading ? {} : _.indexBy(Announcements.find().fetch(), '_id')), [loading]);

  const guesses = useTracker(() => (
    loading || !canUpdateGuesses ?
      [] :
      Guesses.find({ state: 'pending' }, { sort: { createdAt: 1 } }).fetch()
  ), [loading, canUpdateGuesses]);
  const pendingAnnouncements = useTracker(() => (
    loading ?
      [] :
      PendingAnnouncements.find({ user: Meteor.userId()! }, { sort: { createdAt: 1 } }).fetch()
  ), [loading]);
  const chatNotifications = useTracker(() => (
    loading || disableDingwords ?
      [] :
      ChatNotifications.find({}, { sort: { timestamp: 1 } }).fetch()
  ), [loading, disableDingwords]);

  const [hideDiscordSetupMessage, setHideDiscordSetupMessage] = useState<boolean>(false);
  const [hideProfileSetupMessage, setHideProfileSetupMessage] = useState<boolean>(false);
  const [dismissedGuesses, setDismissedGuesses] = useState<Record<string, boolean>>({});

  const onHideDiscordSetupMessage = useCallback(() => {
    setHideDiscordSetupMessage(true);
  }, []);

  const onHideProfileSetupMessage = useCallback(() => {
    setHideProfileSetupMessage(true);
  }, []);

  const dismissGuess = useCallback((guessId: string) => {
    setDismissedGuesses((prevDismissedGuesses) => {
      const newState: Record<string, boolean> = {};
      newState[guessId] = true;
      Object.assign(newState, prevDismissedGuesses);
      return newState;
    });
  }, []);

  const dismissChatNotification = useCallback((chatNotificationId: string) => {
    Meteor.call('dismissChatNotification', chatNotificationId);
  }, []);

  if (loading) {
    return <div />;
  }

  // Build a list of uninstantiated messages with their props, then create them
  const messages = [] as JSX.Element[];

  if (!hasOwnProfile && !hideProfileSetupMessage) {
    messages.push(<ProfileMissingMessage
      key="profile"
      onDismiss={onHideProfileSetupMessage}
    />);
  }

  if (discordEnabledOnServer &&
    !discordConfiguredByUser &&
    !hideDiscordSetupMessage) {
    messages.push(<DiscordMessage key="discord" onDismiss={onHideDiscordSetupMessage} />);
  }

  guesses.forEach((g) => {
    if (dismissedGuesses[g._id]) return;
    messages.push(<GuessMessage
      key={g._id}
      guess={g}
      puzzle={puzzles[g.puzzle]!}
      hunt={hunts[g.hunt]!}
      guesser={displayNames[g.createdBy]!}
      onDismiss={dismissGuess}
    />);
  });

  pendingAnnouncements.forEach((pa) => {
    messages.push(
      <AnnouncementMessage
        key={pa._id}
        id={pa._id}
        announcement={announcements[pa.announcement]!}
        createdByDisplayName={displayNames[pa.createdBy]!}
      />
    );
  });

  chatNotifications.forEach((cn) => {
    messages.push(
      <ChatNotificationMessage
        key={cn._id}
        cn={cn}
        hunt={hunts[cn.hunt]!}
        puzzle={puzzles[cn.puzzle]!}
        senderDisplayName={displayNames[cn.sender]!}
        onDismiss={dismissChatNotification}
      />
    );
  });

  return (
    <StyledNotificationCenter>
      {messages}
    </StyledNotificationCenter>
  );
};

export default NotificationCenter;
