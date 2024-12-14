import dotenv from 'dotenv';
dotenv.config()

import express from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'
import amqp from 'amqplib'

import { commentAction, queueConstants } from '../Common/index.js'
import {posts} from './posts.js'

const app = express()

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

let channel;
const QueueConnection = async ()=>{
    const rmqServer = process.env.RABBITMQ_SERVER_URL
    const connection = await amqp.connect(rmqServer);
    channel = await connection.createChannel();
    await channel.assertQueue(queueConstants.POSTS);
}

QueueConnection()

// routes
app.get('/posts',(req, res)=>{
    return res.status(200).json({posts})
})

app.post('/posts', async (req,res)=>{
    const {post} = req.body
    if(!post){
        return res.status(400).json({msg: 'post is required field'})
    }
    const id = crypto.randomBytes(4).toString('hex');
    posts[id] = {id, post}

    // emit queueConstants.COMMENTS 
    channel.sendToQueue(queueConstants.COMMENTS, Buffer.from(JSON.stringify({id, post, type:commentAction.POST_CREATED})))

    return res.status(200).json({msg: 'post created successfully'})
})

app.post('/events', (req,res)=>{
    console.log('event received')
    return res.status(200).json({msg: ''})
})

const port = process.env.PORT
app.listen(port, async ()=>{
    console.log(`listening on port: ${port}`)
})