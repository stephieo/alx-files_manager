/* eslint-disable */
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
// import { userQueue } from '../worker';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    try {
      // check for existing user
      const userExists = await dbClient.db.collection('users').findOne({ email });
      if (userExists) return res.status(400).json({ error: 'Already exist' });

      // hash pasword
      const hashedPassword = sha1(password);

      // add new user to database
      const result = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
      // userQueue.add({ userId: result.insertedId });
      if (result) return res.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await dbClient.dbClient.collection('users').findOne({ _id: ObjectId(userId) });
      if (user) return res.status(200).json({ id: user._id, email: user.email });
      return res.status(401).json({ error: 'Unauthorized' });
    } catch (error) {
      console.error('Error retrieving user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
