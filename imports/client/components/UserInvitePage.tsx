import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useCallback, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import Row from 'react-bootstrap/Row';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { userMayBulkAddToHunt } from '../../lib/permission_stubs';
import { useBreadcrumb } from '../hooks/breadcrumb';

interface UserInvitePageTracker {
  canBulkInvite: boolean;
}

const BulkError = styled.p`
  white-space: pre-wrap;
`;

const UserInvitePage = () => {
  const huntId = useParams<'huntId'>().huntId!;
  const navigate = useNavigate();
  useBreadcrumb({ title: 'Invite', path: `/hunts/${huntId}/hunters/invite` });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<Meteor.Error | undefined>(undefined);
  const [email, setEmail] = useState<string>('');
  const [bulkEmails, setBulkEmails] = useState<string>('');
  const [bulkError, setBulkError] = useState<Meteor.Error | undefined>(undefined);

  const tracker = useTracker<UserInvitePageTracker>(() => {
    const canBulkInvite = userMayBulkAddToHunt(Meteor.userId(), huntId);
    return { canBulkInvite };
  }, [huntId]);

  const onEmailChanged: FormControlProps['onChange'] = useCallback((e) => {
    setEmail(e.currentTarget.value);
  }, []);

  const onBulkEmailsChanged: FormControlProps['onChange'] = useCallback((e) => {
    setBulkEmails(e.currentTarget.value);
  }, []);

  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    Meteor.call('addToHunt', huntId, email, (inviteError?: Meteor.Error) => {
      setSubmitting(false);
      if (inviteError) {
        setError(inviteError);
      } else {
        navigate(`/hunts/${huntId}`);
      }
    });
  }, [huntId, email, navigate]);

  const onBulkSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setBulkError(undefined);
    const emails = bulkEmails.split('\n');
    Meteor.call('bulkAddToHunt', huntId, emails, (bulkInviteError?: Meteor.Error) => {
      setSubmitting(false);
      if (bulkInviteError) {
        setBulkError(bulkInviteError);
      } else {
        setBulkEmails('');
      }
    });
  }, [huntId, bulkEmails]);

  const bulkInvite = useMemo(() => {
    return tracker.canBulkInvite ? (
      <div>
        <h2>Bulk invite</h2>

        {bulkError ? (
          <Alert variant="danger">
            <BulkError>{bulkError.reason}</BulkError>
          </Alert>
        ) : undefined}

        <form onSubmit={onBulkSubmit} className="form-horizontal">
          <FormGroup controlId="jr-invite-bulk">
            <FormLabel>
              Email addresses (one per line)
            </FormLabel>
            <FormControl
              as="textarea"
              rows={10}
              value={bulkEmails}
              onChange={onBulkEmailsChanged}
            />
          </FormGroup>

          <FormGroup>
            <Button type="submit" variant="primary" disabled={submitting}>
              Send bulk invites
            </Button>
          </FormGroup>
        </form>
      </div>
    ) : undefined;
  }, [tracker.canBulkInvite, submitting, bulkEmails, bulkError, onBulkSubmit, onBulkEmailsChanged]);

  return (
    <div>
      <h1>Send an invite</h1>

      <p>
        Invite someone to join this hunt. They&apos;ll get an email with instructions (even if
        they already have a Jolly Roger account)
      </p>

      <Row>
        <Col md={8}>
          {error ? (
            <Alert variant="danger">
              <p>{error.reason}</p>
            </Alert>
          ) : undefined}

          <form onSubmit={onSubmit} className="form-horizontal">
            <FormGroup as={Row}>
              <FormLabel
                htmlFor="jr-invite-email"
                column
                md={3}
              >
                E-mail address
              </FormLabel>
              <Col md={9}>
                <FormControl
                  id="jr-invite-email"
                  type="email"
                  value={email}
                  onChange={onEmailChanged}
                  disabled={submitting}
                />
              </Col>
            </FormGroup>

            <FormGroup>
              <Col md={{ offset: 3, span: 9 }}>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Send invite
                </Button>
              </Col>
            </FormGroup>
          </form>

          {bulkInvite}
        </Col>
      </Row>
    </div>
  );
};

export default UserInvitePage;
