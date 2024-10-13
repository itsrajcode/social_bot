import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    tgId: {
        type: String,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: { 
        type: String,
        required: true,
    },
    isBot: {
        type: Boolean,
        required: true,
    },
    userName: {
        type: String,
        required: true,
        unique: true,
    },
    promptTokens: { // Corrected typo
        type: Number,
        required: false,
        default: 0
    },
    completionTokens: {
        type: Number,
        required: false,
        default: 0
    }
}, 
{ timestamps: true } // Automatically adds createdAt and updatedAt
);

export default mongoose.model("User", userSchema);
