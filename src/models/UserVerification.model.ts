import mongoose, { Schema } from "mongoose";

interface UserVerification extends Document {
  userId: mongoose.Types.ObjectId;
  uniqueString: string;
  createdAt: Date;
  expiresAt: Date;
}

const userVerification = new mongoose.Schema<UserVerification>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  uniqueString: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const UserVerification = mongoose.model<UserVerification>(
  "UserVerification",
  userVerification
);

export default UserVerification;
