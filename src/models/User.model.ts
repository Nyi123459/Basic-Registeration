  import mongoose, { Document, Model } from "mongoose";
  import bcrypt from "bcryptjs";

  export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    verified: boolean;
    login: boolean;
    isAdmin: boolean;
    matchPassword(enteredPassword: string): Promise<boolean>;
  }

  const userSchema = new mongoose.Schema<IUser>({
    name: {
      type: String,
      required: [true, "Please add a name"],
      minlength: [3, "Username must be at least 3 characters long"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      maxlength: 40,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [7, "Please use a strong password"],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    login: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  });

  // Pre-save hook to hash the password if it is modified
  userSchema.pre<IUser>("save", async function (next) {
    if (!this.isModified("password")) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

  // Method to match the entered password with the hashed password
  userSchema.methods.matchPassword = async function (
    enteredPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  // Create and export the User model
  const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

  export default User;
