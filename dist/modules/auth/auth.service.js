import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
export class AuthService {
    static async register(data) {
        logger.info('User registration attempt', { username: data.username, email: data.email });
        const existingUser = await User.findOne({
            $or: [{ email: data.email }, { username: data.username }]
        });
        if (existingUser) {
            logger.warn('Registration failed: user already exists', { email: data.email });
            throw new Error('Usuário ou email já existe');
        }
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(data.password, salt);
        // Generate unique session ID for this user
        const uniqueSessionId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const user = new User({
            username: data.username,
            email: data.email,
            password: hashedPassword
        });
        await user.save();
        logger.info('User registered successfully', { userId: user._id });
        // Update user with unique session ID
        await this.updateWhatsAppCredentials(user._id.toString(), uniqueSessionId, false);
        const userWithoutPassword = this.removePasswordFromUser(user.toObject());
        const tokens = this.generateTokens(user._id.toString());
        return { user: userWithoutPassword, tokens };
    }
    static async login(credentials) {
        const user = await User.findOne({ email: credentials.email });
        if (!user || !(await user.comparePassword(credentials.password))) {
            throw new Error('Credenciais inválidas');
        }
        const userWithoutPassword = this.removePasswordFromUser(user.toObject());
        const tokens = this.generateTokens(user._id.toString());
        return { user: userWithoutPassword, tokens };
    }
    static async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            return this.generateTokens(user._id.toString());
        }
        catch (error) {
            throw new Error('Token de refresh inválido');
        }
    }
    static async getUserById(userId) {
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }
        return this.removePasswordFromUser(user.toObject());
    }
    static async updateWhatsAppCredentials(userId, sessionId, connected) {
        await User.findByIdAndUpdate(userId, {
            'whatsappCredentials.sessionId': sessionId,
            'whatsappCredentials.connected': connected,
            'whatsappCredentials.lastConnected': connected ? new Date() : undefined
        });
    }
    static async getUserWhatsAppCredentials(userId) {
        const user = await User.findById(userId).select('whatsappCredentials');
        if (!user || !user.whatsappCredentials) {
            return null;
        }
        return {
            sessionId: user.whatsappCredentials.sessionId,
            connected: user.whatsappCredentials.connected
        };
    }
    static generateTokens(userId) {
        const accessToken = jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
        const refreshToken = jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN });
        return { accessToken, refreshToken };
    }
    static removePasswordFromUser(user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        }
        catch (error) {
            throw new Error('Token inválido');
        }
    }
}
AuthService.JWT_SECRET = env.JWT_SECRET || 'default-secret-key';
AuthService.JWT_EXPIRES_IN = '15m';
AuthService.REFRESH_TOKEN_EXPIRES_IN = '7d';
