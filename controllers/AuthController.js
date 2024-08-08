import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    // check for authorized email and password in request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    // decode base64
    const authCreds = authHeader.split(' ')[1];
    const decodedCreds = Buffer.from(authCreds, 'base64').toString('utf-8');
    const [authEmail, authPassword] = decodedCreds.split(':');

    try {
      const hashAuthPassword = sha1(authPassword);
      // check if user exists
      const authUserExists = await dbClient.db.collection('users').findOne({ email: authEmail, password: hashAuthPassword });
      if (!authUserExists) return res.status(401).send({ error: 'Unauthorized' });

      // create session in Redis
      const tokenString = uuidv4();
      const sessionKey = `auth_${tokenString}`;
      redisClient.set(sessionKey, authUserExists._id.toString(), 86400);
      return res.status(200).send({token: tokenString});
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
