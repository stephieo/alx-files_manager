#!/usr/bin/node
import redis from 'redis';
// redis db will be holding session data
class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.log(err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, val) => {
        if (err) {
          reject(err);
        } else {
          resolve(val);
        }
      });
    });
  }

  async set(key, val, duration) {
    return new Promise((resolve, reject) => {
      this.client.setex(key, duration, val, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  async del(key) {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}

const redisClient = new RedisClient();

export default redisClient;
