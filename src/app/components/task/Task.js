import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Relay from 'react-relay/classic';
import { Card, CardHeader, CardActions, CardText } from 'material-ui/Card';
import Checkbox from 'material-ui/Checkbox';
import TextField from 'material-ui/TextField';
import { FormattedMessage, defineMessages, injectIntl, intlShape } from 'react-intl';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import IconEdit from 'material-ui/svg-icons/image/edit';
import styled from 'styled-components';
import rtlDetect from 'rtl-detect';
import TaskActions from './TaskActions';
import SingleChoiceTask from './SingleChoiceTask';
import MultiSelectTask from './MultiSelectTask';
import Message from '../Message';
import CheckContext from '../../CheckContext';
import UpdateTaskMutation from '../../relay/mutations/UpdateTaskMutation';
import UpdateDynamicMutation from '../../relay/mutations/UpdateDynamicMutation';
import DeleteAnnotationMutation from '../../relay/mutations/DeleteAnnotationMutation';
import Can, { can } from '../Can';
import ParsedText from '../ParsedText';
import ShortTextRespondTask from './ShortTextRespondTask';
import GeolocationRespondTask from './GeolocationRespondTask';
import GeolocationTaskResponse from './GeolocationTaskResponse';
import DatetimeRespondTask from './DatetimeRespondTask';
import DatetimeTaskResponse from './DatetimeTaskResponse';
import { Row, units, black16, title1 } from '../../styles/js/shared';
import ProfileLink from '../layout/ProfileLink';
import UserAvatars from '../UserAvatars';
import Attribution from './Attribution';
import Sentence from '../Sentence';
import { safelyParseJSON } from '../../helpers';
import TaskLog from './TaskLog';

const StyledWordBreakDiv = styled.div`
  hyphens: auto;
  overflow-wrap: break-word;
  word-break: break-word;

  .task__card-text {
    padding-bottom: 0 !important;
    padding-top: 0 !important;
  }
`;

const messages = defineMessages({
  confirmDelete: {
    id: 'task.confirmDelete',
    defaultMessage: 'Are you sure you want to delete this task?',
  },
});

const StyledTaskResponses = styled.div`
  .task__resolved {
    border-bottom: 1px solid ${black16};
    padding-bottom: ${units(1)};
    margin-bottom: ${units(1)};
  }
`;

const StyledRequiredIndicator = styled.span`
  color: red;
  font-weight: normal;
  font: ${title1};
  line-height: 20px;
`;

const RequiredIndicator = props => (
  <StyledRequiredIndicator className="task__required">
    { props.required ? '*' : null}
  </StyledRequiredIndicator>
);

class Task extends Component {
  constructor(props) {
    super(props);

    this.state = {
      editingQuestion: false,
      message: null,
      editingResponse: false,
      submitDisabled: true,
      editingAttribution: false,
      required: null,
    };
  }

  getAssignment() {
    const assignment = document.getElementById(`attribution-${this.props.task.dbid}`);
    if (assignment) {
      return assignment.value;
    }
    return null;
  }

  getCurrentUser() {
    return new CheckContext(this).getContextStore().currentUser;
  }

  getResponseData(response) {
    const data = {};
    const { media } = this.props;

    if (response) {
      data.by = [];
      data.byPictures = [];
      response.attribution.edges.forEach((user) => {
        const u = user.node;
        data.by.push(<ProfileLink user={u} team={media.team} />);
        data.byPictures.push(u);
      });
      const fields = JSON.parse(response.content);
      fields.forEach((field) => {
        if (/^response_/.test(field.field_name) && field.value && field.value !== '') {
          data.response = field.value;
        }
        if (/^note_/.test(field.field_name)) {
          data.note = field.value;
        }
      });
    }

    return data;
  }

  handleAction = (action) => {
    switch (action) {
    case 'edit_question':
      this.handleEditQuestion();
      break;
    case 'edit_response':
      this.handleEditResponse(this.props.task.first_response);
      break;
    case 'edit_assignment':
      this.handleEditQuestion();
      break;
    case 'edit_attribution':
      this.handleEditAttribution();
      break;
    case 'delete':
      this.handleDelete();
      break;
    default:
    }
  };

  handleChangeAssignments() {
    this.setState({ submitDisabled: false });
  }

  handleSubmitWithArgs(response, note) {
    const { media, task } = this.props;

    const onFailure = (transaction) => {
      const error = transaction.getError();
      let message = error.source;
      const json = safelyParseJSON(error.source);
      if (json && json.error) {
        message = json.error;
      }
      this.setState({ message });
    };

    const onSuccess = () => {
      this.setState({ message: null });
    };

    const fields = {};
    fields[`response_${task.type}`] = response;
    if (note !== false) {
      fields[`note_${task.type}`] = note || '';
    }
    fields[`task_${task.type}`] = task.dbid;

    Relay.Store.commitUpdate(
      new UpdateTaskMutation({
        annotated: media,
        task: {
          id: task.id,
          fields,
          annotation_type: `task_response_${task.type}`,
        },
      }),
      { onSuccess, onFailure },
    );
  }

  handleEditQuestion() {
    this.setState({ editingQuestion: true });
  }

  handleCancelQuestionEdit() {
    this.setState({ editingQuestion: false, submitDisabled: true, required: null });
  }

  handleCancelAttributionEdit() {
    this.setState({ editingAttribution: false });
  }

  handleQuestionEdit(e) {
    const state = {};
    state[e.target.name] = e.target.value;
    this.setState(state, this.canSubmit);
  }

  handleSelectRequired(e, inputChecked) {
    this.setState({ required: inputChecked, submitDisabled: false });
  }

  handleUpdateAttribution() {
    const { media, task } = this.props;
    // TODO Use React ref
    const { value } = document.getElementById(`attribution-${task.dbid}`);

    const onFailure = (transaction) => {
      const error = transaction.getError();
      let { message } = error;
      const json = safelyParseJSON(error.source);
      if (json && json.error) {
        message = json.error;
      }
      this.setState({ message });
    };

    const onSuccess = () => {
      this.setState({ message: null, editingAttribution: false });
    };

    Relay.Store.commitUpdate(
      new UpdateDynamicMutation({
        annotated: media,
        parent_type: 'project_media',
        dynamic: {
          id: task.first_response.id,
          set_attribution: value,
        },
      }),
      { onSuccess, onFailure },
    );
  }

  handleUpdateTask(e) {
    const { media, task } = this.props;
    const form = document.forms[`edit-task-${task.dbid}`];

    const onFailure = (transaction) => {
      const error = transaction.getError();
      let message = error.source;
      const json = safelyParseJSON(error.source);
      if (json && json.error) {
        message = json.error;
      }
      this.setState({ message });
    };

    const onSuccess = () => {
      this.setState({ message: null, editingQuestion: false, required: null });
    };

    const taskObj = {
      id: task.id,
      label: form.label.value,
      required: this.state.required !== null ? this.state.required : task.required,
      assigned_to_ids: this.getAssignment(),
    };

    if (form.description) {
      taskObj.description = form.description.value || null;
    }

    if (!this.state.submitDisabled) {
      Relay.Store.commitUpdate(
        new UpdateTaskMutation({
          annotated: media,
          task: taskObj,
        }),
        { onSuccess, onFailure },
      );
    }
    this.setState({ submitDisabled: true });

    e.preventDefault();
  }

  handleDelete() {
    const { task, media } = this.props;

    // eslint-disable-next-line no-alert
    if (window.confirm(this.props.intl.formatMessage(messages.confirmDelete))) {
      Relay.Store.commitUpdate(new DeleteAnnotationMutation({
        parent_type: 'project_media',
        annotated: media,
        id: task.id,
      }));
    }
  }

  handleCancelEditResponse() {
    this.setState({
      editingResponse: false,
    });
  }

  handleEditResponse(editingResponse) {
    this.setState({ editingResponse });
  }

  handleEditAttribution() {
    this.setState({ editingAttribution: true });
  }

  canSubmit() {
    const label = typeof this.state.label !== 'undefined' && this.state.label !== null
      ? this.state.label : this.props.task.label || '';

    this.setState({ submitDisabled: !label });
  }

  handleSubmitUpdateWithArgs(edited_response, edited_note) {
    const { media, task } = this.props;

    const onFailure = (transaction) => {
      const error = transaction.getError();
      let message = error.source;
      const json = safelyParseJSON(error.source);
      if (json && json.error) {
        message = json.error;
      }
      this.setState({ message });
    };

    const onSuccess = () => {
      this.setState({ message: null, editingResponse: false });
    };

    const fields = {};
    fields[`response_${task.type}`] = edited_response;
    if (edited_note !== false) {
      fields[`note_${task.type}`] = edited_note;
    }

    Relay.Store.commitUpdate(
      new UpdateDynamicMutation({
        annotated: media,
        parent_type: 'project_media',
        dynamic: {
          id: this.state.editingResponse.id,
          fields,
        },
      }),
      { onSuccess, onFailure },
    );
  }

  renderTaskResponse(responseObj, response, note, by, byPictures, showEditIcon) {
    const { task } = this.props;

    if (this.state.editingResponse && this.state.editingResponse.id === responseObj.id) {
      const editingResponseData = this.getResponseData(this.state.editingResponse);
      const editingResponseText = editingResponseData.response;
      const editingResponseNote = editingResponseData.note;
      return (
        <div className="task__editing">
          <form name={`edit-response-${this.state.editingResponse.id}`}>
            {task.type === 'free_text' ?
              <ShortTextRespondTask
                response={editingResponseText}
                note={editingResponseNote}
                onSubmit={this.handleSubmitUpdateWithArgs.bind(this)}
                onDismiss={this.handleCancelEditResponse.bind(this)}
              />
              : null}
            {task.type === 'geolocation' ?
              <GeolocationRespondTask
                response={editingResponseText}
                note={editingResponseNote}
                onSubmit={this.handleSubmitUpdateWithArgs.bind(this)}
                onDismiss={this.handleCancelEditResponse.bind(this)}
              />
              : null}
            {task.type === 'datetime' ?
              <DatetimeRespondTask
                response={editingResponseText}
                note={editingResponseNote}
                onSubmit={this.handleSubmitUpdateWithArgs.bind(this)}
                onDismiss={this.handleCancelEditResponse.bind(this)}
              />
              : null}
            {task.type === 'single_choice' ?
              <SingleChoiceTask
                mode="edit_response"
                response={editingResponseText}
                note={editingResponseNote}
                jsonoptions={task.jsonoptions}
                onDismiss={this.handleCancelEditResponse.bind(this)}
                onSubmit={this.handleSubmitUpdateWithArgs.bind(this)}
              />
              : null}
            {task.type === 'multiple_choice' ?
              <MultiSelectTask
                mode="edit_response"
                jsonresponse={editingResponseText}
                note={editingResponseNote}
                jsonoptions={task.jsonoptions}
                onDismiss={this.handleCancelEditResponse.bind(this)}
                onSubmit={this.handleSubmitUpdateWithArgs.bind(this)}
              />
              : null}
          </form>
        </div>
      );
    }
    const resolverStyle = {
      display: 'flex',
      alignItems: 'center',
      marginTop: units(1),
      justifyContent: 'space-between',
    };
    return (
      <StyledWordBreakDiv className="task__resolved">
        {task.type === 'free_text' ?
          <div className="task__response">
            <ParsedText text={response} />
          </div>
          : null}
        {task.type === 'geolocation' ?
          <div className="task__response">
            <GeolocationTaskResponse response={response} />
          </div>
          : null}
        {task.type === 'datetime' ?
          <div className="task__response">
            <DatetimeTaskResponse response={response} />
          </div>
          : null}
        {task.type === 'single_choice' ?
          <SingleChoiceTask
            mode="show_response"
            response={response}
            note={note}
            jsonoptions={task.jsonoptions}
          />
          : null}
        {task.type === 'multiple_choice' ?
          <MultiSelectTask
            mode="show_response"
            jsonresponse={response}
            note={note}
            jsonoptions={task.jsonoptions}
          />
          : null}
        <div
          style={{
            display: note ? 'block' : 'none',
            marginTop: units(2),
          }}
          className="task__note"
        >
          <ParsedText text={note} />
        </div>
        { (by && byPictures) ?
          <div className="task__resolver" style={resolverStyle}>
            <small style={{ display: 'flex' }}>
              <UserAvatars users={byPictures} />
              <span style={{ lineHeight: '24px', paddingLeft: units(1), paddingRight: units(1) }}>
                <FormattedMessage
                  id="task.answeredBy"
                  defaultMessage="Answered by {byName}"
                  values={{ byName: <Sentence list={by} /> }}
                />
              </span>
            </small>
            { showEditIcon && can(responseObj.permissions, 'update Dynamic') ?
              <IconEdit
                style={{ width: 16, height: 16, cursor: 'pointer' }}
                onClick={this.handleEditResponse.bind(this, responseObj)}
              /> : null }
          </div> : null }
      </StyledWordBreakDiv>
    );
  }

  render() {
    const { task, media } = this.props;
    const data = this.getResponseData(task.first_response);
    const {
      response, note, by, byPictures,
    } = data;
    const currentUser = this.getCurrentUser();

    let taskAssigned = false;
    const taskAnswered = !!response;

    const assignments = task.assignments.edges;
    const assignmentComponents = [];
    assignments.forEach((assignment) => {
      assignmentComponents.push(<ProfileLink user={assignment.node} team={media.team} />);
      if (currentUser && assignment.node.dbid === currentUser.dbid) {
        taskAssigned = true;
      }
    });

    const isRtl = rtlDetect.isRtlLang(this.props.intl.locale);

    const direction = {
      from: isRtl ? 'right' : 'left',
      to: isRtl ? 'left' : 'right',
    };

    const editQuestionActions = [
      <FlatButton
        key="tasks__cancel"
        label={<FormattedMessage id="tasks.cancelEdit" defaultMessage="Cancel" />}
        onClick={this.handleCancelQuestionEdit.bind(this)}
      />,
      <FlatButton
        key="task__save"
        className="task__save"
        label={<FormattedMessage id="tasks.save" defaultMessage="Save" />}
        primary
        keyboardFocused
        onClick={this.handleUpdateTask.bind(this)}
        disabled={this.state.submitDisabled}
      />,
    ];

    const editAttributionActions = [
      <FlatButton
        key="tasks__cancel"
        label={<FormattedMessage id="tasks.cancelEdit" defaultMessage="Cancel" />}
        onClick={this.handleCancelAttributionEdit.bind(this)}
      />,
      <FlatButton
        key="task__save"
        className="task__save"
        label={<FormattedMessage id="tasks.done" defaultMessage="Done" />}
        primary
        keyboardFocused
        onClick={this.handleUpdateAttribution.bind(this)}
      />,
    ];

    const taskAssignment = task.assignments.edges.length > 0 && !response ? (
      <div className="task__assigned" style={{ display: 'flex', alignItems: 'center', width: 420 }}>
        <small style={{ display: 'flex' }}>
          <UserAvatars users={assignments} />
          <span style={{ lineHeight: '24px', paddingLeft: units(1), paddingRight: units(1) }}>
            <FormattedMessage
              id="task.assignedTo"
              defaultMessage="Assigned to {name}"
              values={{
                name: <Sentence list={assignmentComponents} />,
              }}
            />
          </span>
        </small>
      </div>
    ) : null;

    const taskActionsStyle = {
      marginLeft: 'auto',
      position: 'absolute',
      bottom: '0',
    };
    taskActionsStyle[direction.to] = units(0.5);

    const taskActions = !media.archived ? (
      <div>
        {taskAssignment}
        {data.by && task.status === 'resolved' ?
          <div className="task__resolver" style={{ display: 'flex', alignItems: 'center', marginTop: units(1) }}>
            <small style={{ display: 'flex' }}>
              <UserAvatars users={byPictures} />
              <span style={{ lineHeight: '24px', paddingLeft: units(1), paddingRight: units(1) }}>
                <FormattedMessage
                  id="task.resolvedBy"
                  defaultMessage="Resolved by {byName}"
                  values={{ byName: <Sentence list={by} /> }}
                />
              </span>
            </small>
          </div>
          : null}
        <div style={taskActionsStyle}>
          <TaskActions task={task} media={media} response={response} onSelect={this.handleAction} />
        </div>
      </div>
    ) : null;

    const taskQuestion = (
      <div className="task__question">
        <div className="task__label-container">
          <Row>
            <span className="task__label">
              {task.label}
            </span>
            <RequiredIndicator required={task.required} />
          </Row>
        </div>
      </div>
    );

    let taskBody = null;
    if ((!response || task.responses.edges.length > 1) && !media.archived) {
      taskBody = (
        <div>
          <StyledTaskResponses>
            {task.responses.edges.map((singleResponse) => {
              const singleResponseData = this.getResponseData(singleResponse.node);
              return this.renderTaskResponse(
                singleResponse.node,
                singleResponseData.response,
                singleResponseData.note,
                singleResponseData.by,
                singleResponseData.byPictures,
                true,
              );
            })}
          </StyledTaskResponses>
          {task.status === 'unresolved' ?
            <Can permissions={media.permissions} permission="create Dynamic">
              <div>
                <form name={`task-response-${task.id}`}>

                  <div className="task__response-inputs">
                    {task.type === 'free_text' ?
                      <ShortTextRespondTask
                        onSubmit={this.handleSubmitWithArgs.bind(this)}
                      />
                      : null}
                    {task.type === 'geolocation' ?
                      <GeolocationRespondTask
                        onSubmit={this.handleSubmitWithArgs.bind(this)}
                      /> : null}
                    {task.type === 'datetime' ?
                      <DatetimeRespondTask onSubmit={this.handleSubmitWithArgs.bind(this)} note="" />
                      : null}
                    {task.type === 'single_choice' ?
                      <SingleChoiceTask
                        mode="respond"
                        response={response}
                        note={note}
                        jsonoptions={task.jsonoptions}
                        onSubmit={this.handleSubmitWithArgs.bind(this)}
                      />
                      : null}
                    {task.type === 'multiple_choice' ?
                      <MultiSelectTask
                        mode="respond"
                        jsonresponse={response}
                        note={note}
                        jsonoptions={task.jsonoptions}
                        onSubmit={this.handleSubmitWithArgs.bind(this)}
                      />
                      : null}
                  </div>
                </form>
              </div>
            </Can> : null}
        </div>
      );
    } else {
      taskBody = this.renderTaskResponse(task.first_response, response, note, false, false, false);
    }

    const required = this.state.required !== null ? this.state.required : task.required;

    task.project_media = Object.assign({}, this.props.media);
    delete task.project_media.tasks;

    const taskDescription = task.description ?
      <ParsedText text={task.description} />
      : null;

    const className = ['task'];
    if (taskAnswered) {
      className.push('task__answered-by-current-user');
    }
    if (taskAssigned) {
      className.push('task__assigned-to-current-user');
    }
    if (task.required) {
      className.push('task__required');
    }

    return (
      <StyledWordBreakDiv>
        <Card
          className={className.join(' ')}
          style={{ marginBottom: units(1) }}
          initiallyExpanded
        >
          <CardHeader
            title={taskQuestion}
            subtitle={taskDescription}
            id={`task__label-${task.id}`}
            showExpandableButton
          />

          <CardText expandable className="task__card-text">
            <Message message={this.state.message} />
            {taskBody}
          </CardText>

          <CardActions
            expandable
            style={
              {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                minHeight: units(6),
              }
            }
          >
            {taskActions}
          </CardActions>
          <TaskLog task={task} />
        </Card>

        <Dialog
          actions={editQuestionActions}
          modal={false}
          open={!!this.state.editingQuestion}
          onRequestClose={this.handleCancelQuestionEdit.bind(this)}
          bodyStyle={{ overflowY: 'unset' }}
        >
          <Message message={this.state.message} />
          <form name={`edit-task-${task.dbid}`}>
            <TextField
              name="label"
              floatingLabelText={
                <FormattedMessage id="tasks.taskLabel" defaultMessage="Task label" />
              }
              defaultValue={task.label}
              onChange={this.handleQuestionEdit.bind(this)}
              fullWidth
              multiLine
            />

            <Checkbox
              label={
                <FormattedMessage
                  id="tasks.requiredCheckbox"
                  defaultMessage="Required"
                />
              }
              checked={required}
              onCheck={this.handleSelectRequired.bind(this)}
            />

            <TextField
              name="description"
              floatingLabelText={
                <FormattedMessage id="tasks.description" defaultMessage="Description" />
              }
              defaultValue={task.description}
              onChange={this.handleQuestionEdit.bind(this)}
              fullWidth
              multiLine
            />
            <h3 style={{ marginTop: units(2) }}><FormattedMessage id="tasks.assignment" defaultMessage="Assignment" /></h3>
            <Attribution
              multi
              selectedUsers={assignments}
              onChange={this.handleChangeAssignments.bind(this)}
              id={task.dbid}
              taskType={task.type}
            />
          </form>
        </Dialog>

        <Dialog
          actions={editAttributionActions}
          modal={false}
          open={!!this.state.editingAttribution}
          onRequestClose={this.handleCancelAttributionEdit.bind(this)}
          autoScrollBodyContent
        >
          <Message message={this.state.message} />
          <h3><FormattedMessage id="tasks.editAttribution" defaultMessage="Edit attribution" /></h3>
          <div style={{ marginBottom: units(2), marginTop: units(2) }}>
            <FormattedMessage id="tasks.attributionSlogan" defaultMessage='For the task, "{label}"' values={{ label: task.label }} />
          </div>
          { this.state.editingAttribution ?
            <Attribution
              id={task.dbid}
              multi
              selectedUsers={task.first_response.attribution.edges}
            />
            : null }
        </Dialog>
      </StyledWordBreakDiv>
    );
  }
}

Task.propTypes = {
  // https://github.com/yannickcr/eslint-plugin-react/issues/1389
  // eslint-disable-next-line react/no-typos
  intl: intlShape.isRequired,
};

Task.contextTypes = {
  store: PropTypes.object,
};

export default injectIntl(Task);

export { RequiredIndicator };
