const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// GET /bfhl/tasks/stats (Bonus Analytics Endpoint)
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const statsData = await Task.aggregate([
      {
        $facet: {
          basicMetrics: [
            {
              $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                averageImportance: { $avg: '$importance' },
                overdueTasks: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', 'pending'] }, { $lt: ['$dueDate', now] }] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ],
          importanceBreakdown: [
            { $group: { _id: '$importance', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const metrics = statsData[0].basicMetrics[0] || {
      totalTasks: 0, pendingTasks: 0, completedTasks: 0, averageImportance: 0, overdueTasks: 0
    };

    const tasksByImportance = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    statsData[0].importanceBreakdown.forEach(item => {
      if (item._id !== null) tasksByImportance[item._id] = item.count;
    });

    return res.json({
      totalTasks: metrics.totalTasks,
      pendingTasks: metrics.pendingTasks,
      completedTasks: metrics.completedTasks,
      averageImportance: parseFloat((metrics.averageImportance || 0).toFixed(2)),
      overdueTasks: metrics.overdueTasks,
      tasksByImportance
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute analytics aggregation.' });
  }
});

// POST /bfhl/tasks
router.post('/', async (req, res) => {
  try {
    const { title, description, importance, dueDate } = req.body;
    const task = new Task({ title, description, importance, dueDate });
    await task.save();
    return res.status(201).json(task);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /bfhl/tasks
router.get('/', async (req, res) => {
  try {
    const { status, minImportance } = req.query;
    let queryConditions = {};

    if (status) queryConditions.status = status;
    if (minImportance) {
      const minImpNum = parseInt(minImportance, 10);
      if (!isNaN(minImpNum)) {
        queryConditions.importance = { $gte: minImpNum };
      }
    }

    const tasks = await Task.find(queryConditions);
    
    // Derived sort configuration handled out of memory via schema layer
    const sorted = tasks.map(t => t.toJSON()).sort((a, b) => b.priorityScore - a.priorityScore);
    return res.json(sorted);
  } catch (err) {
    return res.status(500).json({ error: 'Server error retrieving tasks.' });
  }
});

// PATCH /bfhl/tasks/:id
router.patch('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Target task document not found.' });

    const updateableFields = ['title', 'description', 'importance', 'dueDate', 'status'];
    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();
    return res.json(task);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /bfhl/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Target task document not found.' });
    return res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during delete processing.' });
  }
});

module.exports = router;