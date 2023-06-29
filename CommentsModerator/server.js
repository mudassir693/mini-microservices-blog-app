import dotenv from 'dotenv'
dotenv.config()

import express, { response } from 'express'
import fetch from 'node-fetch'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended:true}))

app.post('/events', async (req, res)=>{
    const {type, content} = req.body

    if(type == 'CommentCreated'){
        const status = content.comment.includes('orange') ? 'rejected' : 'approved'

        await fetch('http://localhost:4002/events',{
            method: 'POST',
            body:JSON.stringify({
                type: 'CommentUpdated',
                content: {...content, status}
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })

    }
    return res.status(200).json({msg:""})
})

const port = process.env.PORT
app.listen(port, ()=>{
    console.log(`listening on ${port}`)
})