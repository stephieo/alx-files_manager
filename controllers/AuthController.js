import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const [scheme, credentials] = authHeader.split(' ');
    if (scheme !== 'Basic' || !credentials) return res.status(401).json({ error: 'Unauthorized' });

    const [email, password] = Buffer.from(credentials, 'base64').toString().split(':');
    if (!email || !password) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const hashedPassword = sha1(password);
      const user = await dbClient.dbClient.collection('users').findOne({ email, password: hashedPassword });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const token = uuidv4();
      await redisClient.setex(`auth_${token}`, 86400, user._id.toString());

      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error during authentication:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await redisClient.del(`auth_${token}`);
      return res.status(204).end();
    } catch (error) {
      console.error('Error during sign-out:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
