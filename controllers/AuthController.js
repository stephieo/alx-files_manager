#!/usr/bin/node
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbclient from '../utils/db.js';
import RedisClient from '../utils/redis.js';

export default class AuthController {
  static async getConnect(req, res) {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res
    }
  }
}