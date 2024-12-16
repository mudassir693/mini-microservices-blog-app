import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import fetch from 'node-fetch'

import {events} from './events.js'

const app = express()
// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// routes
// events receiver

app.post('/events', async (req, res)=>{
    const {type, content, ...others} = req.body
    console.log('received event type: ',type)

    events.push({type, content})

    // await fetch(`http://posts-svc:4000/events`,{
    //     method: 'POST',
    //     body: JSON.stringify({type, content}),
    //     headers:{
    //         'Content-Type': 'application/json'
    //     }
    // })

    // events.push({type, content})

    await fetch('http://posts-svc:4000/events',{
        method: 'POST',
        body: JSON.stringify({type, content}),
        headers:{
            'Content-Type': 'application/json'
        }
    })
    
    // await fetch(`http://localhost:4001/events`,{
    //     method: 'POST',
    //     body: JSON.stringify({type, content}),
    //     headers:{
    //         'Content-Type': 'application/json'
    //     }
    // }).catch((error)=>{
        
    // })

    // await fetch(`http://localhost:4003/events`,{
    //     method: 'POST',
    //     body: JSON.stringify({type, content}),
    //     headers:{
    //         'Content-Type': 'application/json'
    //     }
    // })

    return res.status(200).json({msg:''})
})

app.get('/events', (req, res)=>{
    return res.status(200).json({events})
})

// morechanges

// this line as well
const port = process.env.PORT
app.listen(port, ()=>{
    console.log(`listening on ${port}`)
})
