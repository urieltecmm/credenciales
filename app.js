const express = require('express');
const bodyParser= require('body-parser');
const dotenv = require("dotenv");

const mysql = require("mysql2/promise");

const https = require("https");
const fs = require('fs');
const handlebars = require('handlebars');

dotenv.config();

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json()) 
app.use(bodyParser.urlencoded({ extended: true })) 

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

app.get('/validarCredencial/:id', async (req, res) => {
    const {id} = req.params;
    
    const con = await db.getConnection();
    try{
        const [alumno] = await con.query("SELECT  CONCAT(Users.name, ' ', Users.firstName, ' ', Users.secondName) AS nombre, UserStudents.code AS no_control, Programs.name AS carrera, UserStudents.sem AS semestre, OrgCampus.name AS unidad, UserStudents.opc AS status FROM  UserStudents  INNER JOIN(Users) ON(Users.user_IdUser = UserStudents.user_IdUser) INNER JOIN(Programs) ON(Programs.prog_IdProgram = UserStudents.prog_IdProgram) INNER JOIN(OrgCampus) ON(OrgCampus.org_IdCampus = UserStudents.org_IdCampus) WHERE md5(UserStudents.code) = ?", [id]);
        if(alumno.length === 0) return res.status(404).send("No se encontro credencial");

        let tipo = alumno[0].status === 'Vigente' ? 'vigente' : 'baja'; 

        const source = fs.readFileSync('./views/plantilla.html').toString();
        const replacements = {
            "nombre": alumno[0].nombre, 
            "no_control": alumno[0].no_control, 
            "carrera": alumno[0].carrera,
            "semestre": alumno[0].semestre,
            "unidad": alumno[0].unidad,
            "tipo": tipo,
            "status": alumno[0].status
        };

        const template = handlebars.compile(source);
        const htmlToSend = template(replacements);
        res.send(htmlToSend);
    }catch(error){
        console.log(err);
        res.status(500).json({ ok: false, msg: 'Algo salió mal' });
    } finally {
        con.release();
    }
});

app.get('/validarCredencial/:id', async (req, res) => {});


// Iniciar el servidor
if(process.env.ENV === 'produccion'){
    const privateKey  = fs.readFileSync(process.env.private_key, 'utf8');
    const ca = fs.readFileSync(process.env.ca, 'utf8');
    const certificate = fs.readFileSync(process.env.certificate, 'utf8');

    const credentials = { key: privateKey, ca: ca, cert: certificate };
    const https_server = https.createServer( credentials, app );

    https_server.listen( process.env.PORT , () => { console.log('servidor corriendo en el puerto: ', process.env.PORT); });

}else{
    app.listen(process.env.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${process.env.PORT}`);
});
}
