const express = require('express');
const path = require('path');
const app = express();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const PORT = process.env.PORT;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectionLimit: 10,
    queueLimit: 10
})

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

//logger
app.use((req, res, next) => {
    console.log(new Date().toISOString(), req.method, req.url);
    next();
})

//route express

app.get('/acceuil', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})
app.get('/inscription', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'))
})
app.get('/connexion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'connexion.html'))
})

//route POST

app.post('/api/register', async (req, res) => {
    const { name, firstname, email, password } = req.body;
    const pass_hash = await bcrypt.hash(password, 10);
    if (!name || !firstname || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont requis !' })
    } else {

        try {
            const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? or username = ? and firstname = ?', [email, name, firstname])
            if (rows.lenght === 0) {
                await pool.execute('INSERT INTO users (username,firstname,email,password_hash) VALUES (?,?,?,?) ', [name, firstname, email, pass_hash])
            console.log('Données introduite dans base de données avec succès !');
            
            }
            return res.redirect('/connexion.html');


        } catch (error) {
            console.log('Erreur SQL:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });

        }
    }

})



app.listen(PORT, () => {
    console.log(`Serveur en écoute sur http://localhost:${PORT}`);
})