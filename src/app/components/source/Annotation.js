import React, { Component, PropTypes } from 'react';
import Relay from 'react-relay';
import Card from 'material-ui/lib/card/card';
import CardHeader from 'material-ui/lib/card/card-header';
import CardText from 'material-ui/lib/card/card-text';
import CardActions from 'material-ui/lib/card/card-actions';
import FlatButton from 'material-ui/lib/flat-button';
import Divider from 'material-ui/lib/divider';
import TimeAgo from 'react-timeago';
import DeleteAnnotationMutation from '../../relay/DeleteTagMutation';

class Annotation extends Component {
  handleDelete(id) {
    Relay.Store.commitUpdate(
      new DeleteAnnotationMutation({
        annotated: this.props.annotated,
        id: id
      })
    );
  }

  render() {
    const annotation = this.props.annotation;

    // Display is different, based on annotation type
    let content = JSON.parse(annotation.content);
    switch (annotation.annotation_type) {
      case 'comment':
        content = content.text;
        break;
      case 'tag':
        content = 'Tagged as "' + content.tag + '"'
        break;
      default:
        content = annotation.content;
    }

    return (
      <div className="annotation">
        <Card>
          <CardHeader title={annotation.annotator.name} subtitle={<TimeAgo date={annotation.created_at} live={false} />} 
                      avatar={annotation.annotator.profile_image} />
          <CardText>{content}</CardText>
          <Divider />
          <CardActions>
            <FlatButton label="Delete" onClick={this.handleDelete.bind(this, annotation.id)} className="delete-annotation" />
          </CardActions>
        </Card>
      </div>
    );
  }
}

export default Annotation;
