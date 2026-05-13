import { Meteor } from 'meteor/meteor';

import { TASKS_PUBLICATION_NAME, TasksCollection } from './TasksCollection';

Meteor.publish(TASKS_PUBLICATION_NAME, function publishTasks() {
  return TasksCollection.find({}, { sort: { order: 1, createdAt: 1 } });
});
