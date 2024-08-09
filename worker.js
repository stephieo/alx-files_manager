import Queue from "bull/lib/queue";
const thumbnailGenerator = require('image-thumbnail');
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
import dbClient from './utils/db';


const fileQueue = new Queue('fileQueue')
fileQueue.process(async (job, done) => {
    const fieldId = job.data.id;
    if (!fieldId) {
        done(new Error('Missing id'));

    }
    const userId = job.data.userId;
    if (!userId) {
        done(new Error('Missing userId'));

    }
    const files = await dbClient.db.collection('files');

    const file = await files.findOne({ _id: ObjectId(fieldId), userId: ObjectId(userId) });
    if (!file) {
        done(new Error('File not found'));

    }

})