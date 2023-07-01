import dotenv from 'dotenv';
dotenv.config()

import express from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'

import {posts} from './posts.js'

const app = express()

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

    await fetch(`http://event-bus-svc:4002/events`,{
        method: 'POST',
        body: JSON.stringify({
            type: "PostCreated",
            content: {id, post},
        }),
        headers: {'Content-Type': 'application/json'}
    })

    return res.status(200).json({msg: 'post created successfully'})
})

app.post('/events', (req,res)=>{
    console.log('event received')
    return res.status(200).json({msg: ''})
})

const port = process.env.PORT
app.listen(port, async ()=>{
    console.log(`listening on port: ${port}`)
    const resp = await fetch(`http://event-bus-svc:4002/events`)
    console.log("resp: ", await resp.json())
})