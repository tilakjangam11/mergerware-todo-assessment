import { Meteor } from 'meteor/meteor';

import '../imports/api/tasksMethods';
import '../imports/api/tasksPublications';
import { TasksCollection } from '../imports/api/TasksCollection';

const starterTasks = [
  { text: 'Finish the Meteor assessment', category: 'Work' },
  { text: 'Buy groceries for home', category: 'Personal' },
  { text: 'Submit the project before the deadline', category: 'Urgent' },
];

Meteor.startup(async () => {
  // Seed a few starter tasks so the tutorial app has data on first run.
  const tasksCount = await TasksCollection.find({}).countAsync();

  if (tasksCount > 0) {
    return;
  }

  await Promise.all(
    starterTasks.map((task, index) =>
      TasksCollection.insertAsync({
        ...task,
        createdAt: new Date(),
        isChecked: false,
        order: index,
      })),
  );
});
