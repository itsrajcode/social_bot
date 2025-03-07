import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    tgId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Event", EventSchema);
