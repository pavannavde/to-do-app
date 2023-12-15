const express = require('express');
const  mongoose = require('mongoose');
require('dotenv').config()
const clc = require('cli-color');
const userModel = require('./models/userModel');
const { cleanUpAndValidate } = require('./utiles/authUtile');

//constants
const app = express();
const PORT = process.env.PORT;

//Mongodb connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log(clc.blue('Connected to MongoDB'));
})
.catch((err) => {
    console.log(clc.red(err));
})

//Middlewares
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Routes
app.get('/', (req, res) => {
   return res.send('Hello World');
});

app.get('/register',(req,res)=>{
    return res.render('register');
})

app.get('/login',(req,res)=>{
    return res.render('login');
})

//Registration Api
app.post('/register',async(req,res)=>{
    const {name,email,password,username} = req.body;

    //Data Validation
    try{
         await cleanUpAndValidate(req.body);
    }
    catch(err){
       return res.send({
            status:400,
            error:err
        })
    }

    //create user in db
    const userObj = new userModel({
        name:name,
        email:email,
        password :password,
        username:username
    });

    //make entry in db
    try{
        const userdb = await userObj.save();
        
        return res.send({
            status:201,
            message:"User Created Successfully",
            data:userdb
        });
    }
    catch(err){
        return res.send({
            status:500,
            message: 'Database error',
            error:err
        });
    }
})


app.listen(PORT, () => {
    console.log(clc.yellow(`Server is running on port ${PORT}`));
    console.log(clc.yellowBright.underline(`http://localhost:${PORT}`));
});