#!/usr/bin/node
const redis = require('redis');

class RedisClient {
  constructor() {
     this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.log("Error! :", err);
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
      this.client.setex(key, duration, val, (err) => {
        if (err) {
          reject(err);
        } else { 
          resolve(true);
       }
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      }
    });
  }

}

const redisClient = new RedisClient();

module.exports = redisClient;
