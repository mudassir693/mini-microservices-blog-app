import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'
import amqp from 'amqplib'
const app = express()


import {comments} from './comments.js' 
import {commentAction, queueConstants} from '../Common/index.js'
let channel;
const QueueConnection = async ()=>{
    const rmqServer = process.env.RABBITMQ_SERVER_URL

    const connection = await amqp.connect(rmqServer);
    channel = await connection.createChannel();
    await channel.assertQueue(queueConstants.COMMENTS);

    channel.consume(queueConstants.COMMENTS, (data)=>{
        const {type} = JSON.parse(data.content)
        switch(type){
            case commentAction.POST_CREATED:
                var {id} = JSON.parse(data.content)
                comments[id] = []
                channel.ack(data)
                break
            case commentAction.COMMENT_MODERATED:
                var {pId, id, status} = JSON.parse(data.content)
                console.log(comments)
                comments[pId] && (comments[pId].find(comment => comment.id == id).status =  status)
                channel.ack(data)
                break
        }
    })
}

QueueConnection()
// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// routes

app.get('/comments',(req, res)=>{
    return res.status(200).json({comments})
})

// api routes
app.post('/comments/:pId', async (req, res)=>{
    const {comment} = req.body
    const commentId = crypto.randomBytes(4).toString('hex')
    let commentByPost = comments[req.params.pId] || []
    commentByPost.push({id: commentId, comment, status: 'pending'})

    // emit queueConstants.COMMENT_MODERATOR
    channel.sendToQueue(queueConstants.COMMENT_MODERATOR, Buffer.from(JSON.stringify({id: commentId, comment, pId: req.params.pId, status: 'pending'})))
    return res.status(200).json({msg:"comment created successfully"})
})

const port = process.env.PORT
app.listen(port, async ()=>{
    console.log(`listening on ${port}`)
})