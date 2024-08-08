#!/usr/bin/node
import express from 'express';
import dbRoutes from './routes/index';

const app = express();
const port = process.env.PORT || '5000';

app.use(express.json());
app.use('/', dbRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
