const express = require('express');
const path = require('path');
const app = express();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
require('dotenv').config();

const cookieParser = require('cookie-parser');
app.use(cookieParser()); // à mettre avant tes routes

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

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // format "Bearer token"

    if (!token) {
        return res.status(401).json({ success: false, message: "Token manquant" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Token invalide" });
        }
        req.user = user; // infos du token stockées dans req.user
        next();
    });
}




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
app.get('/api/profil', authenticateToken, (req, res) => {

    res.json({
        success: true,
        message: "Accès autorisé",
        user: req.user
    });
});
app.get('/ui', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ui.html'))
})

//route POST

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Utilisateur introuvable" });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Mot de passe incorrect" });
        }
        // Génération du token :
        const token = jwt.sign(
            { id: user.id, email: user.email },   // infos utiles
            process.env.JWT_SECRET,
            { expiresIn: "5min" }  // durée de validité
        );
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // en prod https obligatoire
            maxAge: 3600000 // 1h
        });
        return res.redirect('/ui');

    } catch (error) {
        console.log("Erreur login:", error);
        return res.status(500).json({ success: false, message: "Erreur serveur" });

    }
})


app.post('/api/register', async (req, res) => {
    const { name, firstname, email, password } = req.body;
    const pass_hash = await bcrypt.hash(password, 10);
    if (!name || !firstname || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont requis !' })
    } else {

        try {
            const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? or username = ? and firstname = ?', [email, name, firstname])
            if (rows.length === 0) {
                await pool.execute('INSERT INTO users (username,firstname,email,password_hash) VALUES (?,?,?,?) ', [name, firstname, email, pass_hash])
                console.log('Données introduite dans base de données avec succès !');

            } else {
                console.log("Erreur. Utilisateur déjà existant dans la base de données");
                console.log(rows);
                return res.status(400).json({ success: false, message: 'Erreur utilisateur déjà existant' });
            }
            return res.redirect('/connexion.html');


        } catch (error) {
            console.log('Erreur SQL:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });

        }
    }

})

function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("Token manquant");

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send("Token invalide");
        req.user = user;
        next();
    });
}

app.listen(PORT, () => {
    console.log(`Serveur en écoute sur http://localhost:${PORT}`);
})