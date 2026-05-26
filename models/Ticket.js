const mongoose = require('mongoose');

const SLA_TARGETS = {
  urgent: 1 * 60,   // 1 hour in minutes
  high: 4 * 60,     // 4 hours
  medium: 24 * 60,  // 24 hours
  low: 72 * 60      // 72 hours
};

const ticketSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  description: { type: String, required: true },
  customerEmail: { 
    type: String, 
    required: true, 
    match: [/^\s*[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}\s*$/, 'Invalid email format'] 
  },
  priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'urgent'] },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'resolved', 'closed'], 
    default: 'open' 
  },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

ticketSchema.set('toJSON', {
  transform: (doc, ret) => {
    const endPoint = ret.resolvedAt ? new Date(ret.resolvedAt) : new Date();
    const ageMinutes = Math.floor((endPoint - new Date(ret.createdAt)) / 60000);
    
    const targetMinutes = SLA_TARGETS[ret.priority];
    let slaBreached = false;

    if (ret.resolvedAt) {
      const resolutionTime = Math.floor((new Date(ret.resolvedAt) - new Date(ret.createdAt)) / 60000);
      slaBreached = resolutionTime > targetMinutes;
    } else {
      slaBreached = ageMinutes > targetMinutes;
    }

    ret.ageMinutes = ageMinutes;
    ret.slaBreached = slaBreached;
    return ret;
  }
});

module.exports = mongoose.model('Ticket', ticketSchema);