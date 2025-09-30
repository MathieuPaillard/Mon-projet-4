const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config();

const PORT = process.env.PORT;

//Middlewares
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,'public')));

//logger
app.use((req,res,next)=>{
    console.log(new Date().toISOString() , req.method, req.url);
    next();
})

//route express

app.get('/acceuil',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','index.html'))
})
app.get('/inscription',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','register.html'))
})
app.get('/connexion',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','connexion.html'))
})





app.listen(PORT,()=>{
    console.log(`Serveur en écoute sur http://localhost:${PORT}`);
})