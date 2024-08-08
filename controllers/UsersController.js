#!/usr/bin/node
import dbclient from '../utils/db';
import sha1 from 'sha1';

export default class UsersController {
  static async postNew(req, res) {
    const { email } = req.body;
    const { password } = req.body;
    if (!email) {
      return res.status(400).send('Missing email');
    }
    if (!password) {
      return res.status(400).send('Missing password');
    }
    try {      
      const checkUser = await dbclient.db.collection('users').findOne({ email });
      if(checkUser) {
        return res.status(400).send('Already exist');
      }
  
      const passwordHashed = sha1(password);
  
      dbclient.db.users.insertOne({ email: email, password: passwordHashed })
      .then((newUserId ) => {
        return res.status(201).send({ email, id: newUserId });
      })
      .catch((err)=> {
          console.log(err);
      });
    } catch (err) {
      console.log('Internal server error');
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
