const express = require('express');
const  mongoose = require('mongoose');
require('dotenv').config()
const clc = require('cli-color');
const userModel = require('./models/userModel');
const { cleanUpAndValidate } = require('./utiles/authUtile');
const bcrypt = require('bcrypt');
const validator =require('validator');
const session = require('express-session');
const mongodbSession = require('connect-mongodb-session')(session);
const { isAuth } = require('./middlewares/authMiddleware');
const sessionModel = require('./models/sessionModel');
const todoModel = require('./models/todoModel');
const { validateToDo } = require('./utiles/todoUtile');
//constants
const app = express();
const PORT = process.env.PORT;
const store = new mongodbSession({
    uri:process.env.MONGO_URI,
    collection:'sessions'
})

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
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    store:store
}))

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

    try{
    //Email and Username should not be there in database already
    const isEmailExist = await userModel.findOne({email});
    if(isEmailExist){
        return res.send({
            status:400,
            message:"Email already exists"
        })
    }
    const isUsernameExist = await userModel.findOne({username});
    if(isUsernameExist){
        return res.send({
            status:400,
            message:"Username already exists"
        })
    }
    //Password hashing
    const hashPassword = await bcrypt.hash(password,parseInt(process.env.SALT));
    
    //create user in db
    const userObj = new userModel({
        name:name,
        email:email,
        password :hashPassword,
        username:username
    });

    //make entry in db
    
        const userdb = await userObj.save();
        
        return res.redirect('/login');
    }
    catch(err){
        return res.send({
            status:500,
            message: 'Database error',
            error:err
        });
    }
})

//Login Api
app.post('/login',async(req,res)=>{
     const{loginId,password} = req.body;

     //Data Validation
     if(!loginId || !password){
        return res.send({
            status:400,
            message:"Please enter loginId and password"
        })
     }
     try{
        let user={};

        //checking whether loginId is email or username and it is present in Db or not
        if(validator.isEmail(loginId)){
            //Email
            user = await userModel.findOne({email:loginId});
        }
        else{
            //Username
            user = await userModel.findOne({username:loginId});
        }

        //if loginId is not present in db 
        if(!user){
            return res.send({
                status:400,
                message:"User not found"
            })
        }
        //password comparision
        const isMatch = await bcrypt.compare(password,user.password);

        //if password is not matched
        if(!isMatch){
            return res.send({
                status:400,
                message:"Invalid password"
            })
        }
        //session based Auth
        req.session.isAuth=true;
        req.session.user={
            userID:user._id,
            username:user.username,
            email:user.email,
        };

        return res.redirect('/dashboard');
     }
     catch(err){
        return res.send({
            status:500,
            message:"Database error",
            error:err
        })
     }

});

//dashboard route
app.get('/dashboard',isAuth,(req,res)=>{
    return res.render('dashboard');
});

//logout route
app.post('/logout',isAuth,async(req,res)=>{
    try{
        req.session.destroy();
        return res.redirect('/login');
    }
    catch(err){
        return res.send({
            status:500,
            message:"Database error",
            error:err
        })
    }
})

//log-out-from all devices route
app.post('/logout_from_all_devices',isAuth,async(req,res)=>{
    const username = req.session.user.username;

    //delete the sessions created by the same username in different devices
    try{
        const deleteSessionCount = await sessionModel.deleteMany({"session.user.username":username,});
        console.log(deleteSessionCount);
        return res.redirect('/login');
    }
    catch(err){
        return res.send("Logout Unsuccessfull")
    }
});

//create todo route
app.post('/create-item',isAuth,async(req,res)=>{

    //username and todo from req
    const todoText = req.body.todo;
    const username = req.session.user.username;

    //Todo validation 
    try{
        const validate = await validateToDo(todoText);
    }catch(err){
        return res.send({
            status:400,
            error:err
        })
    }
    //save todo in db
    const todoObj = new todoModel({
        todo:todoText,
        username:username
    });

    try{
       const todoDb = await todoObj.save();
        return res.send({
            status:201,
            message:"Todo created successfully",
           data:todoDb
        })
    }
    catch(err){ 
        return res.send({
            status:500,
            message:"Database error",
            error:err
        })
    }
})

app.listen(PORT, () => {
    console.log(clc.yellow(`Server is running on port ${PORT}`));
    console.log(clc.yellowBright.underline(`http://localhost:${PORT}`));
});