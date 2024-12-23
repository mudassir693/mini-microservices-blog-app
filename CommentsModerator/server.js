import dotenv from 'dotenv';
import express from 'express';
import amqp from 'amqplib';
import { commentAction, queueConstants } from '../Common/index.js';

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize RabbitMQ channel
let channel;

// RabbitMQ connection setup and message handling
const connectToQueue = async () => {
  const rmqServer = process.env.RABBITMQ_SERVER_URL;
  if (!rmqServer) {
    console.error("RABBITMQ_SERVER_URL is not defined in environment variables");
    process.exit(1);
  }

  try {
    // Connect to RabbitMQ server and create a channel
    const connection = await amqp.connect(rmqServer);
    channel = await connection.createChannel();
    await channel.assertQueue(queueConstants.COMMENT_MODERATOR);

    // Consume messages from COMMENT_MODERATOR queue
    channel.consume(queueConstants.COMMENT_MODERATOR, (data) => {
      try {
        const { comment, ...other } = JSON.parse(data.content);
        
        // Comment moderation logic: filtering based on keyword "orange"
        const status = comment.includes('orange') ? 'rejected' : 'approved';

        const updatedComment = {
          ...other,
          status,
          type: commentAction.COMMENT_MODERATED
        };

        // Send the updated comment to the COMMENTS queue
        channel.sendToQueue(queueConstants.COMMENTS, Buffer.from(JSON.stringify(updatedComment)));

        // Acknowledge message after processing
        channel.ack(data);

      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    process.exit(1);
  }
};

// Start the server and connect to RabbitMQ
const startServer = async () => {
  try {
    // Establish RabbitMQ connection
    await connectToQueue();

    // Start the Express server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });

  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();

// Graceful shutdown
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
