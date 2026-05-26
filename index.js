const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const taskRoutes = require('./routes/taskRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Namespace explicit compliance
app.use('/bfhl/tasks', taskRoutes);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`TaskFlow Engine listening on ${PORT}`)))
  .catch(err => console.error('Database configuration mapping failed:', err));