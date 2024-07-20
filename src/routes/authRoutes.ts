import express, { Request, Response } from "express";
import { registerUser, authUser } from "../controllers/authControllers";

const router = express.Router();

router.post("/register", (req: Request, res: Response) =>
  registerUser(req, res)
);
router.post("/login", (req: Request, res: Response) => authUser(req, res));

export default router;
