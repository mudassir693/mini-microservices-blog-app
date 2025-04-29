import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'
import amqp from 'amqplib'

import { comments } from './comments.js'
import { commentAction, queueConstants } from '../Common/index.js'

const app = express()
let channel

// Environment variable validation
const rmqServer = process.env.RABBITMQ_SERVER_URL
if (!rmqServer) {
    console.error("RABBITMQ_SERVER_URL is not defined in environment variables")
    process.exit(1)
}

// Queue connection setup
const QueueConnection = async () => {
    try {
        const connection = await amqp.connect(rmqServer)
        channel = await connection.createChannel()
        await channel.assertQueue(queueConstants.COMMENTS)
        channel.consume(queueConstants.COMMENTS, (data) => {
            const { type } = JSON.parse(data.content)

            switch (type) {
                case commentAction.POST_CREATED:
                    handlePostCreated(data)
                    break
                case commentAction.COMMENT_MODERATED:
                    handleCommentModerated(data)
                    break
                default:
                    console.log(`Unknown action type: ${type}`)
            }
        })
    } catch (error) {
        console.error("Error connecting to RabbitMQ:", error)
        process.exit(1)
    }
}

const handlePostCreated = (data) => {
    const { id } = JSON.parse(data.content)
    comments[id] = []
    channel.ack(data)
}

const handleCommentModerated = (data) => {
    const { pId, id, status } = JSON.parse(data.content)
    if (comments[pId]) {
        const comment = comments[pId].find(comment => comment.id === id)
        if (comment) {
            comment.status = status
        }
    }
    channel.ack(data)
}

// Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.get('/comments', (req, res) => {
    return res.status(200).json({ comments })
})

// API Routes
app.post('/comments/:pId', async (req, res) => {
    const { comment } = req.body
    const commentId = crypto.randomBytes(4).toString('hex')
    const postId = req.params.pId

    // Ensure the post exists in the comments object
    if (!comments[postId]) {
        comments[postId] = []
    }

    const newComment = { id: commentId, comment, status: 'pending' }
    comments[postId].push(newComment)

    // Emit COMMENT_MODERATOR event to the queue
    try {
        channel.sendToQueue(queueConstants.COMMENT_MODERATOR, Buffer.from(JSON.stringify({
            id: commentId, comment, pId: postId, status: 'pending'
        })))
        return res.status(200).json({ msg: "Comment created successfully" })
    } catch (error) {
        console.error("Error sending to queue:", error)
        return res.status(500).json({ msg: "Failed to create comment" })
    }
})

// Start Express Server
const port = process.env.PORT || 3000
app.listen(port, async () => {
    console.log(`Server is listening on port ${port}`)
    await QueueConnection()
})

// Graceful Shutdown
const gracefulShutdown = () => {
    console.log("Graceful shutdown initiated")
    if (channel) {
        channel.close()
    }
    process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
