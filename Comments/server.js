import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'
const app = express()


import {comments} from './comments.js' 

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// routes

app.get('/comments',(req, res)=>{
    return res.status(200).json({comments})
})
// helper fn

const handleEvents = (type, content)=>{
    switch(type){
        case 'PostCreated':
            comments[content.id] = []
            break
        case 'CommentUpdated':
            comments[content.pId].find(comment => comment.id == content.id).status =  content.status   
            break
        default:
            'no way to enter here'
            break
    }
}

// api routes
app.post('/comments/:pId', async (req, res)=>{
    const {comment} = req.body
    const commentId = crypto.randomBytes(4).toString('hex')
    let commentByPost = comments[req.params.pId] || []
    commentByPost.push({id: commentId, comment, status: 'pending'})
    await fetch(`http://localhost:4002/events`,{
        method: 'POST',
        body: JSON.stringify({
            type: "CommentCreated",
            content: {id: commentId, comment, pId: req.params.pId, status: 'pending'}
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    return res.status(200).json({msg:"comment created successfully"})
})

app.post('/events', (req,res)=>{
    const {type, content} = req.body
    handleEvents(type, content)
   
    return res.status(200).json({msg: ''})
})


const port = process.env.PORT
app.listen(port, async ()=>{
    console.log(`listening on ${port}`)

    let events = await fetch(`http://localhost:4002/events`)
    let jsonEvents = await events.json()
    jsonEvents.events.forEach(eachEvent=>{
        if(eachEvent.type){
            handleEvents(eachEvent.type, eachEvent.content)
        }
    }) 
})