import dotenv from 'dotenv';
import express from 'express';
import crypto from 'crypto';
import amqp from 'amqplib';
import { comments } from './comments.js';
import { commentAction, queueConstants } from '../Common/index.js';

// Load environment variables
dotenv.config();

// Initialize app and channel
const app = express();
let channel;

// Environment variable validation
const rmqServer = process.env.RABBITMQ_SERVER_URL;
if (!rmqServer) {
  console.error("RABBITMQ_SERVER_URL is not defined in environment variables");
  process.exit(1);
}

// Queue connection setup
const connectToQueue = async () => {
  try {
    const connection = await amqp.connect(rmqServer);
    channel = await connection.createChannel();
    await channel.assertQueue(queueConstants.COMMENTS);
    
    // Consume messages from the queue
    channel.consume(queueConstants.COMMENTS, (data) => {
      const { type } = JSON.parse(data.content);
      switch (type) {
        case commentAction.POST_CREATED:
          handlePostCreated(data);
          break;
        case commentAction.COMMENT_MODERATED:
          handleCommentModerated(data);
          break;
        default:
          console.log(`Unknown action type: ${type}`);
      }
    });
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    process.exit(1);
  }
};

// Handle Post Created Event
const handlePostCreated = (data) => {
  const { id } = JSON.parse(data.content);
  comments[id] = [];
  channel.ack(data);  // Acknowledge the message
};

// Handle Comment Moderated Event
const handleCommentModerated = (data) => {
  const { pId, id, status } = JSON.parse(data.content);
  if (comments[pId]) {
    const comment = comments[pId].find(comment => comment.id === id);
    if (comment) {
      comment.status = status;
    }
  }
  channel.ack(data);  // Acknowledge the message
};

// Create a new comment
const createComment = (comment, postId, commentId) => {
  // Ensure the post exists in the comments object
  if (!comments[postId]) {
    comments[postId] = [];
  }

  const newComment = { id: commentId, comment, status: 'pending' };
  comments[postId].push(newComment);
  return newComment;
};

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/comments', (req, res) => {
  return res.status(200).json({ comments });
});

app.post('/comments/:pId', async (req, res) => {
  const { comment } = req.body;
  const postId = req.params.pId;
  const commentId = crypto.randomBytes(4).toString('hex');

  try {
    // Create a new comment
    const newComment = createComment(comment, postId, commentId);

    // Emit COMMENT_MODERATOR event to the queue
    channel.sendToQueue(queueConstants.COMMENT_MODERATOR, Buffer.from(JSON.stringify({
      id: commentId,
      comment,
      pId: postId,
      status: 'pending',
    })));

    return res.status(200).json({ msg: "Comment created successfully" });
  } catch (error) {
    console.error("Error in creating comment:", error);
    return res.status(500).json({ msg: "Failed to create comment" });
  }
});

// Start Express Server
const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Server is listening on port ${port}`);
  await connectToQueue();  // Connect to the RabbitMQ queue
});

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log("Graceful shutdown initiated");
  if (channel) {
    channel.close();
  }
  process.exit(0);
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
