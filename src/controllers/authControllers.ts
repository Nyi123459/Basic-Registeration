import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid"; // Correct import for uuidv4
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User, { IUser } from "../models/User.model";
import UserVerification from "../models/UserVerification.model";
import transporter from "../config/emailConfig";

dotenv.config();

const generateToken = (id: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

export const signupUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!name || !email || !password || !confirmPassword) {
      res.status(400).json({
        status: "FAILED",
        message: "Empty input fields!",
      });
      return;
    }

    if (!/^[a-zA-Z ]*$/.test(name)) {
      res.status(400).json({
        status: "FAILED",
        message: "Invalid name entered",
      });
      return;
    }

    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      res.status(400).json({
        status: "FAILED",
        message: "Invalid email entered",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        status: "FAILED",
        message: "Password is too short!",
      });
      return;
    }

    if (!passwordRegex.test(password)) {
      res.status(400).json({
        status: "FAILED",
        message:
          "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({
        status: "FAILED",
        message: "Passwords do not match",
      });
      return;
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({
        status: "FAILED",
        message: "User already exists",
      });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      verified: false,
    });

    if (user) {
      const uniqueString = uuidv4();
      const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
      const userVerification = new UserVerification({
        userId: user._id,
        uniqueString: hashedUniqueString,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiration
      });

      await userVerification.save();

      const verificationUrl = `http://localhost:5000/api/user/verify/${user._id}/${uniqueString}`;

      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Email Verification",
        html: `<p>Please verify your email by clicking on the following link: <a href="${verificationUrl}"><button>Confirm</button></a></p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });

      res.status(201).json({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(400).json({
        status: "FAILED",
        message: "Invalid user data",
      });
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      status: "ERROR",
      message: err.message,
    });
  }
};

export const verifyMail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, uniqueString } = req.params;

    const userVerification = await UserVerification.findOne({ userId });

    if (!userVerification) {
      res.status(400).json({
        status: "FAILED",
        message: "Invalid or expired verification link",
      });
      return;
    }

    const { expiresAt, uniqueString: hashedUniqueString } = userVerification;

    if (expiresAt < new Date()) {
      await Promise.all([
        UserVerification.deleteOne({ userId }),
        User.findByIdAndDelete(userId),
      ]);
      res
        .status(400)
        .json({ status: "FAILED", message: "Verification link has expired" });
      return;
    }

    const isMatch = await bcrypt.compare(uniqueString, hashedUniqueString);

    if (!isMatch) {
      res
        .status(400)
        .json({ status: "FAILED", message: "Invalid verification details" });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(400).json({ status: "FAILED", message: "User not found" });
      return;
    }

    user.verified = true;
    user.login = true;
    await user.save();

    await UserVerification.deleteOne({ userId });

    res
      .status(200)
      .json({ status: "SUCCESS", message: "Email verified successfully" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ status: "ERROR", message: err.message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: "FAILED",
        message: "Empty credentials",
      });
      return;
    }

    const user: IUser | null = await User.findOne({ email });

    if (!user) {
      res
        .status(401)
        .json({ status: "FAILED", message: "Invalid email or password" });
      return;
    }

    if (!user.verified) {
      res
        .status(401)
        .json({ status: "FAILED", message: "Please verify your email" });
      return;
    }

    if (!user.login) {
      res
        .status(401)
        .json({ status: "FAILED", message: "User is not allowed to login" });
      return;
    }

    if (await user.matchPassword(password)) {
      res.json({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        token: generateToken(user._id.toString()),
      });
    } else {
      res
        .status(401)
        .json({ status: "FAILED", message: "Invalid email or password" });
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ status: "ERROR", message: err.message });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).send("User ID not found");
      return;
    }
    const userId = req.user.id;

    const userDetail = await User.findById(userId);
    if (!userDetail) {
      res.status(404).send("User not found");
      return;
    }

    res.status(200).send(userDetail);
  } catch (error) {
    const err = error as Error;
    res.status(400).send(err.message);
  }
};
