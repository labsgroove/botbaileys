import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    whatsappCredentials: {
        sessionId: {
            type: String,
            default: null
        },
        connected: {
            type: Boolean,
            default: false
        },
        lastConnected: {
            type: Date,
            default: null
        }
    }
}, {
    timestamps: true
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};
export const User = mongoose.model('User', userSchema);
