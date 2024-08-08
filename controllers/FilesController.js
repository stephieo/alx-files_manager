/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import { promises } from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import dbclient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    // verify correct token
    const token = req.headers['X-Token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    //  retrieve user from Redisdb based on token
    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    } catch(error) {
      console.error('Error retrieving user based on token:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    //  extract input fields for posting files from body
    const {
      name,
      type,
      parentId,
      isPublic = false,
      data,
    } = req.body;

    // verifying important info: filename, type and data ( fo non-folders)
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type != 'folder') return res.status(400).json({ error: 'Missing data' });
    
    if (parentId) {
      // check if parent folder exists in mongodb 
      try{
        let parentFileExist = await dbclient.db.collection('files').findOne({_id: parentId});
        if (!parentFileExist) return res.status(400).json({ error: 'Parent not found' });
        if (parentFileExist.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
      } catch(error) {
        console.error('Error checking for parent folder:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }

    // create the file to be added to database
    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId || 0,
      localPath: filePath || null,
    };

    //  for folders, just insert document and return response
    if (type === 'folder') {
      const result = await dbclient.db.collection('files').insertOne(newfile);
      if (result) return res.status.send({result, ...newFile});
    }

    // for files

    // get folder path
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    // construct full filepath
    const filenameUnique = uuidv4();
    filePath = path.join(folderPath, filenameUnique);

    // check that folder path exists, if not create it
    await promises.mkdir(folderPath, { recursive: true });

    // convert data extracted from req.body and write to file on disk
    try{
      const fileData = Buffer.from(data, 'base64');
      await promises.writeFile(filePath, fileData);
    } catch(error) {
      console.error('Error writing file to disk:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    //  insert document into mongo database
    try {
      const result = await dbClient.dbClient.collection('files').insertOne(newFile);
      return res.status(201).json({ ...newFile, id: result.insertedId });
    } catch (error) {
      console.error('Error saving file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.dbClient.collection('files').findOne({ _id: fileId, userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json(file);
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { parentId = 0, page = 0 } = req.query;
    const pageSize = 20;
    const skip = page * pageSize;

    try {
      const files = await dbClient.dbClient.collection('files')
        .aggregate([
          { $match: { userId, parentId: parseInt(parentId, 10) } },
          { $skip: skip },
          { $limit: pageSize },
        ])
        .toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.error('Error retrieving files:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const fileId = req.params.id;
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' }); 
    }

    await dbClient.db
      .collection('files')
      .updateOne(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: true } },
      );

    const updatedFile = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(fileId) });
    return res.status(200).json(updatedFile);
  }


}

export default FilesController;
