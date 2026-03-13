import mongoose, { Schema } from "mongoose";
const chatThreadSchema = new Schema({
    sessionId: { type: String, required: true, index: true },
    jid: { type: String, required: true },
    aliases: { type: [String], default: [] },
    name: { type: String, default: null },
    unread: { type: Number, default: 0 },
    lastTimestamp: { type: Number, default: 0 },
    lastMessage: { type: String, default: "" },
    lastMessageType: { type: String, default: null },
    isGroup: { type: Boolean, default: false },
}, { timestamps: true });
chatThreadSchema.index({ sessionId: 1, jid: 1 }, { unique: true });
chatThreadSchema.index({ sessionId: 1, aliases: 1 });
chatThreadSchema.index({ sessionId: 1, lastTimestamp: -1 });
export const ChatThread = mongoose.model("ChatThread", chatThreadSchema);
