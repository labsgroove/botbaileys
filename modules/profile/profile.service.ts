import { WASocket, jidNormalizedUser } from "@whiskeysockets/baileys";
import { logger } from "../../utils/logger";
import { normalizeJid } from "../../utils/message.utils";

export class ProfileService {
  private profilePictureCache: Map<string, string> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(private sock: WASocket, private sessionId: string) {}

  /**
   * Obtém a URL da foto de perfil de um contato
   */
  async getProfilePictureUrl(jid: string): Promise<string | null> {
    try {
      if (!jid) return null;
      
      const normalizedJid = normalizeJid(jid);
      if (!normalizedJid) return null;
      
      // Verificar cache primeiro
      const cached = this.getCachedUrl(normalizedJid);
      if (cached) {
        return cached;
      }

      // Buscar foto de perfil usando Baileys
      const pictureUrl = await this.sock.profilePictureUrl(normalizedJid, "image");
      
      if (pictureUrl) {
        // Cache da URL
        this.setCache(normalizedJid, pictureUrl);
        logger.debug(`Profile picture URL obtained for ${normalizedJid}`);
        return pictureUrl;
      }

      logger.debug(`No profile picture found for ${normalizedJid}`);
      return null;
    } catch (error) {
      logger.error(`Error getting profile picture for ${jid}:`, error);
      return null;
    }
  }

  /**
   * Obtém foto de perfil em buffer (base64)
   */
  async getProfilePictureBuffer(jid: string): Promise<Buffer | null> {
    try {
      if (!jid) return null;
      
      const normalizedJid = normalizeJid(jid);
      if (!normalizedJid) return null;
      
      // Usar o método do Baileys para obter a imagem
      const picture = await this.sock.profilePictureUrl(normalizedJid, "preview");
      
      if (picture) {
        // Baixar a imagem
        const response = await fetch(picture);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error getting profile picture buffer for ${jid}:`, error);
      return null;
    }
  }

  /**
   * Limpa o cache de um contato específico
   */
  clearCache(jid: string): void {
    if (!jid) return;
    
    const normalizedJid = normalizeJid(jid);
    if (!normalizedJid) return;
    
    this.profilePictureCache.delete(normalizedJid);
    this.cacheTimestamps.delete(normalizedJid);
  }

  /**
   * Limpa todo o cache
   */
  clearAllCache(): void {
    this.profilePictureCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Obtém URL do cache se ainda for válida
   */
  private getCachedUrl(jid: string): string | null {
    const cached = this.profilePictureCache.get(jid);
    const timestamp = this.cacheTimestamps.get(jid);
    
    if (cached && timestamp && (Date.now() - timestamp) < this.CACHE_TTL) {
      return cached;
    }
    
    // Limpar cache expirado
    if (cached) {
      this.profilePictureCache.delete(jid);
      this.cacheTimestamps.delete(jid);
    }
    
    return null;
  }

  /**
   * Define cache com timestamp
   */
  private setCache(jid: string, url: string): void {
    this.profilePictureCache.set(jid, url);
    this.cacheTimestamps.set(jid, Date.now());
  }

  /**
   * Obtém múltiplas fotos de perfil em lote
   */
  async getMultipleProfilePictures(jids: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    // Filtrar JIDs válidos
    const validJids = jids.filter(jid => jid && normalizeJid(jid));
    
    // Processar em paralelo com limite para não sobrecarregar
    const batchSize = 5;
    for (let i = 0; i < validJids.length; i += batchSize) {
      const batch = validJids.slice(i, i + batchSize);
      const promises = batch.map(async (jid) => {
        const url = await this.getProfilePictureUrl(jid);
        results.set(jid, url);
      });
      
      await Promise.allSettled(promises);
    }
    
    return results;
  }

  /**
   * Verifica se um contato tem foto de perfil
   */
  async hasProfilePicture(jid: string): Promise<boolean> {
    const url = await this.getProfilePictureUrl(jid);
    return url !== null;
  }
}
