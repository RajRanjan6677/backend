const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

const VALID_TRANSITIONS = {
  open: { forward: 'in_progress', backward: null },
  in_progress: { forward: 'resolved', backward: 'open' },
  resolved: { forward: 'closed', backward: 'in_progress' },
  closed: { forward: null, backward: 'resolved' }
};

// Create Ticket
router.post('/', async (expressReq, res) => {
  try {
    const ticket = new Ticket(expressReq.body);
    await ticket.save();
    return res.status(201).json(ticket);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// List Tickets with filters
router.get('/', async (expressReq, res) => {
  try {
    const { status, priority, breached } = expressReq.query;
    let query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;

    let tickets = await Ticket.find(query);

    if (breached === 'true') {
      tickets = tickets.filter(t => t.toJSON().slaBreached === true);
    }

    return res.json(tickets);
  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching tickets.' });
  }
});

// Get Stats
router.get('/stats', async (expressReq, res) => {
  try {
    const tickets = await Ticket.find();
    
    const stats = {
      statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
      priorityCounts: { low: 0, medium: 0, high: 0, urgent: 0 },
      openBreachedCount: 0
    };

    tickets.forEach(ticket => {
      const jsonTicket = ticket.toJSON();
      
      if (stats.statusCounts[jsonTicket.status] !== undefined) {
        stats.statusCounts[jsonTicket.status]++;
      }
      if (stats.priorityCounts[jsonTicket.priority] !== undefined) {
        stats.priorityCounts[jsonTicket.priority]++;
      }
      if (jsonTicket.status !== 'resolved' && jsonTicket.status !== 'closed' && jsonTicket.slaBreached) {
        stats.openBreachedCount++;
      }
    });

    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: 'Server error computing stats.' });
  }
});

// Update Ticket (Status transitions)
router.patch('/:id', async (expressReq, res) => {
  try {
    const { status: nextStatus } = expressReq.body;
    if (!nextStatus) return res.status(400).json({ error: 'Status field is required.' });

    const ticket = await Ticket.findById(expressReq.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const currentStatus = ticket.status;
    if (currentStatus === nextStatus) return res.json(ticket);

    const rules = VALID_TRANSITIONS[currentStatus];
    const isValidForward = rules.forward === nextStatus;
    const isValidBackward = rules.backward === nextStatus;

    if (!isValidForward && !isValidBackward) {
      return res.status(400).json({ 
        error: `Invalid transition from ${currentStatus} to ${nextStatus}.` 
      });
    }

    ticket.status = nextStatus;

    if (nextStatus === 'resolved') {
      ticket.resolvedAt = new Date();
    } else if (currentStatus === 'resolved' && nextStatus === 'in_progress') {
      ticket.resolvedAt = undefined; 
    }

    await ticket.save();
    return res.json(ticket);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Delete Ticket
router.delete('/:id', async (expressReq, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(expressReq.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    return res.json({ message: 'Ticket deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error deleting ticket.' });
  }
});

module.exports = router;