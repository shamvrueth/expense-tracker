import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoute from './routes/authRoute.js';
import expenseRoute from './routes/expenseRoute.js';
import budgetRoute from './routes/budgetRoute.js';
import userRoute from './routes/userRoute.js'

dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}))
app.use(express.json());
app.get('/', (req, res) => {
  res.json({message:'Welcome to the Expense Tracker API', status:'healthy'});
})

app.use('/api/auth', authRoute);
app.use('/api/expense', expenseRoute);
app.use('/api/budget', budgetRoute);
app.use("/api/user", userRoute);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
