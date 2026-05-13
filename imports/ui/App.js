import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

import { TASKS_PUBLICATION_NAME, TasksCollection } from '/imports/api/TasksCollection';
import './App.html';

const HIDE_COMPLETED_KEY = 'hideCompleted';
const CATEGORY_FILTER_KEY = 'selectedCategory';
const ALL_CATEGORIES_FILTER = 'All';

let draggedTaskId = null;

// We always read tasks using the saved order field so drag-and-drop stays persistent.
const getAllTasks = () =>
  TasksCollection.find({}, { sort: { order: 1, createdAt: 1 } }).fetch();

// The category filter and "hide completed" filter both run on the client for quick UI updates.
const getVisibleTasks = (instance) => {
  const hideCompleted = instance.state.get(HIDE_COMPLETED_KEY);
  const selectedCategory = instance.state.get(CATEGORY_FILTER_KEY);

  return getAllTasks().filter((task) => {
    if (hideCompleted && task.isChecked) {
      return false;
    }

    if (selectedCategory !== ALL_CATEGORIES_FILTER && task.category !== selectedCategory) {
      return false;
    }

    return true;
  });
};

// Reorder the visible list after a drag operation.
const reorderVisibleTasks = (visibleTasks, draggedId, targetId) => {
  const draggedIndex = visibleTasks.findIndex((task) => task._id === draggedId);
  const targetIndex = visibleTasks.findIndex((task) => task._id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return visibleTasks;
  }

  const reorderedTasks = [...visibleTasks];
  const [draggedTask] = reorderedTasks.splice(draggedIndex, 1);

  reorderedTasks.splice(targetIndex, 0, draggedTask);

  return reorderedTasks;
};

// When only a filtered subset is visible, we replace just those positions in the full list.
const buildNewOrderIds = (allTasks, visibleTasks, reorderedVisibleTasks) => {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task._id));
  const visiblePositions = [];

  allTasks.forEach((task, index) => {
    if (visibleTaskIds.has(task._id)) {
      visiblePositions.push(index);
    }
  });

  const reorderedByPosition = new Map();

  visiblePositions.forEach((position, index) => {
    reorderedByPosition.set(position, reorderedVisibleTasks[index]._id);
  });

  return allTasks.map((task, index) => reorderedByPosition.get(index) || task._id);
};

const clearDragClasses = () => {
  document.querySelectorAll('.task-item').forEach((item) => {
    item.classList.remove('is-dragging', 'drop-target');
  });
};

Template.mainContainer.onCreated(function mainContainerOnCreated() {
  this.state = new ReactiveDict();
  this.state.set(HIDE_COMPLETED_KEY, false);
  this.state.set(CATEGORY_FILTER_KEY, ALL_CATEGORIES_FILTER);

  this.subscribe(TASKS_PUBLICATION_NAME);
});

Template.mainContainer.helpers({
  tasks() {
    return getVisibleTasks(Template.instance());
  },

  hasTasks() {
    return getVisibleTasks(Template.instance()).length > 0;
  },

  pendingTasksCount() {
    return getVisibleTasks(Template.instance()).filter((task) => !task.isChecked).length;
  },

  hideCompletedLabel() {
    return Template.instance().state.get(HIDE_COMPLETED_KEY)
      ? 'Show Completed'
      : 'Hide Completed';
  },

  isHideCompletedActive() {
    return Template.instance().state.get(HIDE_COMPLETED_KEY) ? 'active' : '';
  },

  isSelectedCategory(category) {
    return Template.instance().state.get(CATEGORY_FILTER_KEY) === category ? 'active' : '';
  },
});

Template.mainContainer.events({
  'submit .task-form'(event) {
    event.preventDefault();

    const form = event.target;
    const text = form.text.value.trim();
    const category = form.category.value;

    if (!text) {
      return;
    }

    Meteor.call('tasks.insert', text, category);

    form.reset();
    form.category.value = 'Work';
  },

  'click .delete-task'() {
    Meteor.call('tasks.remove', this._id);
  },

  'change .toggle-checked'(event) {
    Meteor.call('tasks.setIsChecked', this._id, event.target.checked);
  },

  'click #toggle-completed-button'(event, instance) {
    const currentState = instance.state.get(HIDE_COMPLETED_KEY);
    instance.state.set(HIDE_COMPLETED_KEY, !currentState);
  },

  'click .filter-button[data-category]'(event, instance) {
    instance.state.set(CATEGORY_FILTER_KEY, event.currentTarget.dataset.category);
  },

  'dragstart .task-item'(event) {
    draggedTaskId = this._id;

    const nativeEvent = event.originalEvent || event;
    nativeEvent.dataTransfer.effectAllowed = 'move';
    nativeEvent.dataTransfer.setData('text/plain', this._id);

    clearDragClasses();
    event.currentTarget.classList.add('is-dragging');
  },

  'dragover .task-item'(event) {
    event.preventDefault();

    if (draggedTaskId && draggedTaskId !== this._id) {
      event.currentTarget.classList.add('drop-target');
    }
  },

  'dragleave .task-item'(event) {
    event.currentTarget.classList.remove('drop-target');
  },

  'drop .task-item'(event, instance) {
    event.preventDefault();
    event.currentTarget.classList.remove('drop-target');

    if (!draggedTaskId || draggedTaskId === this._id) {
      return;
    }

    const allTasks = getAllTasks();
    const visibleTasks = getVisibleTasks(instance);
    const reorderedVisibleTasks = reorderVisibleTasks(visibleTasks, draggedTaskId, this._id);
    const orderedTaskIds = buildNewOrderIds(allTasks, visibleTasks, reorderedVisibleTasks);

    Meteor.call('tasks.reorder', orderedTaskIds);
  },

  'dragend .task-item'() {
    draggedTaskId = null;
    clearDragClasses();
  },
});
