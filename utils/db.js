#!/usr/bin/node
import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';

    this.client = new MongoClient(`mongodb://${host}:${port}`, {
      useUnifiedTopology: true,
    });

    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
      })
      .catch(() => {
        this.db = null;
        console.log('Database Connection Failure');
      });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    this.users = this.db.collection('users');
    const countAllUsers = await this.users.countDocuments({});
    return countAllUsers;
  }

  async nbFiles() {
    this.files = this.db.collection('files');
    const queryAllFiles = await this.files.find({}).toArray();
    return queryAllFiles.length;
  }
}

const dbclient = new DBClient();
export default dbclient;
