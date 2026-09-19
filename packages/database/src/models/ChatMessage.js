import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true, index: true },
  guildId: { type: String, default: "" },
  author: { type: String, default: "Bilinmiyor" },
  authorId: { type: String, default: "" },
  authorAvatar: { type: String, default: "" },
  content: { type: String, default: "" },
  previousContent: { type: String, default: "" },
  editHistory: { type: [Object], default: [] },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);
