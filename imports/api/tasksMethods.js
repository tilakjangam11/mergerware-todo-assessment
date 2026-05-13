import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import {
  DEFAULT_CATEGORY,
  TASK_CATEGORIES,
  TasksCollection,
} from './TasksCollection';

// Categories are fixed so the UI and database stay in sync.
const ensureValidCategory = (category) => {
  if (!TASK_CATEGORIES.includes(category)) {
    throw new Meteor.Error('tasks.invalidCategory', 'Please choose a valid category.');
  }
};

Meteor.methods({
  async 'tasks.insert'(text, category = DEFAULT_CATEGORY) {
    check(text, String);
    check(category, String);

    // Create a clean task with the next available order number.
    const cleanText = text.trim();

    if (!cleanText) {
      throw new Meteor.Error('tasks.emptyText', 'Task text cannot be empty.');
    }

    ensureValidCategory(category);

    const lastTask = await TasksCollection.findOneAsync({}, { sort: { order: -1 } });

    return TasksCollection.insertAsync({
      text: cleanText,
      category,
      createdAt: new Date(),
      isChecked: false,
      order: lastTask ? lastTask.order + 1 : 0,
    });
  },

  'tasks.remove'(taskId) {
    check(taskId, String);
    // Delete a task by id.
    return TasksCollection.removeAsync(taskId);
  },

  'tasks.setIsChecked'(taskId, isChecked) {
    check(taskId, String);
    check(isChecked, Boolean);

    // Toggle the checked state for the task.
    return TasksCollection.updateAsync(taskId, {
      $set: { isChecked },
    });
  },

  async 'tasks.reorder'(orderedTaskIds) {
    check(orderedTaskIds, [String]);

    // The server validates the complete task list before saving a new order.
    const existingTasks = await TasksCollection.find(
      {},
      { fields: { _id: 1 }, sort: { order: 1, createdAt: 1 } },
    ).fetchAsync();

    const existingIds = existingTasks.map((task) => task._id).sort();
    const incomingIds = [...orderedTaskIds].sort();

    if (existingIds.length !== incomingIds.length) {
      throw new Meteor.Error('tasks.invalidOrder', 'The new task order is incomplete.');
    }

    for (let index = 0; index < existingIds.length; index += 1) {
      if (existingIds[index] !== incomingIds[index]) {
        throw new Meteor.Error('tasks.invalidOrder', 'The new task order does not match the saved tasks.');
      }
    }

    await Promise.all(
      orderedTaskIds.map((taskId, index) =>
        TasksCollection.updateAsync(taskId, {
          $set: { order: index },
        })),
    );
  },
});
