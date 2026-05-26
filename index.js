import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.json({ text: "Hello from the Backend Boilerplate!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});