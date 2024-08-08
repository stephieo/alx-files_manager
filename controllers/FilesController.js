#!/usr/bin/node
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name,
      type,
      parentId,
      isPublic = false,
      data,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    let parentFile;
    if (parentId) {
      parentFile = await dbClient.dbClient.collection('files').findOne({ _id: parentId });
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    let filePath;
    if (type !== 'folder') {
      filePath = path.join(folderPath, `${uuidv4()}_${name}`);
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId || 0,
      localPath: filePath || null,
    };

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
          { $limit: pageSize }
        ])
        .toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.error('Error retrieving files:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}


export default FilesController;
