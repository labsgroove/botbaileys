import { AuthService } from '../modules/auth/auth.service';
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token de acesso não fornecido' });
        }
        const decoded = AuthService.verifyToken(token);
        req.user = { id: decoded.userId };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = AuthService.verifyToken(token);
            req.user = { id: decoded.userId };
        }
        next();
    }
    catch (error) {
        next();
    }
};
