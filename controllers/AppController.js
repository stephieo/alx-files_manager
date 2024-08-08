#!/usr/bin/node
import redisClient from '../utils/redis';
import dbclient from '../utils/db';

export default class AppController {
  static getStatus(req, res) {
    if (redisClient.isAlive() && dbclient.isAlive()) {
      res.status(200).send({ redis: true, db: true });
    }
  }

  static async getStats(req, res) {
    const totalDbUsers = await dbclient.nbUsers();
    const totalDbFiles = await dbclient.nbFiles();
    res.status(200).send({ users: totalDbUsers, files: totalDbFiles });
  }
}
