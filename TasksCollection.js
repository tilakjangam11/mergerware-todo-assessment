import { Mongo } from 'meteor/mongo';

export const TasksCollection = new Mongo.Collection('tasks');

export const TASKS_PUBLICATION_NAME = 'tasks';
export const TASK_CATEGORIES = ['Work', 'Personal', 'Urgent'];
export const DEFAULT_CATEGORY = TASK_CATEGORIES[0];
