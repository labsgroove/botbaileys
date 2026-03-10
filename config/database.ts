import mongoose from 'mongoose'

export class Database {
  private static instance: Database
  private isConnected = false

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('MongoDB já está conectado')
      return
    }

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://rdlionco:YcMv9G2cJWNtoENW@ac-h9wnnyn-shard-00-00.fipv3tk.mongodb.net:27017,ac-h9wnnyn-shard-00-01.fipv3tk.mongodb.net:27017,ac-h9wnnyn-shard-00-02.fipv3tk.mongodb.net:27017/?ssl=true&replicaSet=atlas-dc0w4t-shard-0&authSource=admin&appName=Cluster0/whatsapp-bot'
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })

      this.isConnected = true
      console.log('MongoDB conectado com sucesso')

      mongoose.connection.on('error', (error) => {
        console.error('Erro na conexão MongoDB:', error)
        this.isConnected = false
      })

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB desconectado')
        this.isConnected = false
      })

    } catch (error) {
      console.error('Erro ao conectar ao MongoDB:', error)
      this.isConnected = false
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await mongoose.disconnect()
      this.isConnected = false
      console.log('MongoDB desconectado com sucesso')
    } catch (error) {
      console.error('Erro ao desconectar do MongoDB:', error)
      throw error
    }
  }

  public isConnectionActive(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1
  }
}

export const database = Database.getInstance()
