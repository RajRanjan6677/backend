const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    minlength: 3, 
    maxlength: 100 
  },
  description: { 
    type: String, 
    maxlength: 500 
  },
  importance: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Importance must be an integer (1-5).'
    }
  },
  dueDate: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(val) {
        if (!this.isNew) return true; // Only enforce future-date on creation
        return val > new Date();
      },
      message: 'Due date must be a future date upon task creation.'
    }
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed'], 
    default: 'pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Calculate priorityScore on read without saving to database
taskSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.status === 'completed') {
      ret.priorityScore = 0.00;
    } else {
      const now = new Date();
      const due = new Date(ret.dueDate);
      
      const timeDiff = due.getTime() - now.getTime();
      const rawDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const daysUntilDue = Math.max(rawDays, 1);

      const computedScore = (ret.importance * 10) + (100 / daysUntilDue);
      ret.priorityScore = parseFloat(computedScore.toFixed(2));
    }
    return ret;
  }
});

module.exports = mongoose.model('Task', taskSchema);