import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  ticketId: { type: Number, required: true, unique: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  openerId: { type: String, required: true },
  claimedBy: { type: String, default: null },
  category: { type: String, default: "GENEL" },
  status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
  closedBy: { type: String, default: null },
  closedAt: { type: Date, default: null },
  transcript: [{
    authorId: { type: String, required: true },
    authorTag: { type: String, required: true },
    content: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
  }],
  rating: { type: Number, default: 0 }
}, { timestamps: true });

TicketSchema.index({ guildId: 1, ticketId: 1 });

export const Ticket = mongoose.model("Ticket", TicketSchema);
