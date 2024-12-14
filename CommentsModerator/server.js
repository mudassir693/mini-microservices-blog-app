import dotenv from 'dotenv'
dotenv.config()

import express, { response } from 'express'
import fetch from 'node-fetch'
import { commentAction, queueConstants } from '../Common/index.js'

// import amqp from 'amqplib'
// changes here

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended:true}))

let channel;
const QueueConnection = async ()=>{
    const rmqServer = process.env.RABBITMQ_SERVER_URL

    const connection = await amqp.connect(rmqServer);
    channel = await connection.createChannel();
    await channel.assertQueue(queueConstants.COMMENT_MODERATOR);

    // consume queueConstants.COMMENT_MODERATOR and emit queueConstants.COMMENTS
    channel.consume(queueConstants.COMMENT_MODERATOR, data=>{
        const {comment, ...other} = JSON.parse(data.content)
        const status = comment.includes('orange') ? 'rejected' : 'approved' // here we use to filter with orange keyword later will implement AI support for proper Comment moderation
        const updatedComment = {
            ...other,
            status,
            type: commentAction.COMMENT_MODERATED
        }
        channel.sendToQueue(queueConstants.COMMENTS, Buffer.from(JSON.stringify(updatedComment)))
    })
}

// another line here

QueueConnection()
// add
const port = process.env.PORT
app.listen(port, ()=>{
    console.log(`listening on ${port}`)
})
