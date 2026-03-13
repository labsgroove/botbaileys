import mongoose, { Schema } from "mongoose";
const crmContactSchema = new Schema({
    sessionId: { type: String, required: true, index: true },
    jid: { type: String, required: true },
    aliases: { type: [String], default: [] },
    kind: { type: String, required: true, default: "individual" },
    phone: { type: String, default: null, index: true },
    name: { type: String, default: null },
    notify: { type: String, default: null },
    verifiedName: { type: String, default: null },
    pushName: { type: String, default: null },
    firstMessageAt: { type: Number, default: null },
    lastMessageAt: { type: Number, default: null },
    lastInboundAt: { type: Number, default: null },
    lastOutboundAt: { type: Number, default: null },
    inboundCount: { type: Number, default: 0 },
    outboundCount: { type: Number, default: 0 },
}, { timestamps: true });
crmContactSchema.index({ sessionId: 1, jid: 1 }, { unique: true });
crmContactSchema.index({ sessionId: 1, aliases: 1 });
crmContactSchema.index({ sessionId: 1, lastMessageAt: -1 });
export const CrmContact = mongoose.model("CrmContact", crmContactSchema);
