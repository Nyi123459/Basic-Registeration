import express, { Request, Response } from "express";
import {
  signupUser,
  loginUser,
  verifyMail,
  getUser,
} from "../controllers/authControllers";
import protectedRoute from "../middlewares/authMiddlewares";

const router = express.Router();

router.post("/register", (req: Request, res: Response) => signupUser(req, res));
router.get("/verify/:userId/:uniqueString", verifyMail);
router.post("/login", (req: Request, res: Response) => loginUser(req, res));
router.get("/me", protectedRoute, getUser);

export default router;
