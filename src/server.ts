import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use("/api/user", authRoutes);

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => console.log(`Server running on the port ${PORT}`));
