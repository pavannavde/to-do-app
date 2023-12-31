const express = require('express');
const  mongoose = require('mongoose');
require('dotenv').config()
const clc = require('cli-color');
const userModel = require('./models/userModel');
const sessionModel = require('./models/sessionModel');
const todoModel = require('./models/todoModel');
const bcrypt = require('bcrypt');
const validator =require('validator');
const session = require('express-session');
const mongodbSession = require('connect-mongodb-session')(session);
const rateLimiting = require('./middlewares/rateLimting');
const jwt = require('jsonwebtoken');
//files
const { cleanUpAndValidate, generateToken,sendVerificationMail } = require('./utiles/authUtile');
const { isAuth } = require('./middlewares/authMiddleware');
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
app.use(express.static("public"));

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
        //generate Token
        const verificationToken = generateToken(email)
        //send verification mail
        console.log(verificationToken)

        sendVerificationMail({email,verificationToken});
        
        return res.redirect('/login');
    }
    catch(err){
        console.log(err);
        return res.send({
            status:500,
            message: 'Database1 error',
            error:err
        });
    }
})
//email verification
app.get("/verifytoken/:id",async(req,res)=>{
    const token = req.params.id;
    //verify token
    jwt.verify(token,process.env.SECRET_KEY,async(err,email)=>{
        try{
             await userModel.findOneAndUpdate({email:email},{isEmailAuthenticated:true})
             
             return res.send({
                status:200,
                message:"Email verified ,please go to login page"
             });
        }
        catch(err){
            return res.send({
                status:500,
                message:"Database error",
                error:err
            })
        }
    });
       
});

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
        //is email is not verified
        if (!user.isEmailAuthenticated) {
            return res.send({
              status: 401,
              message: "Please verify your email Id",
            });
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
app.get('/dashboard',isAuth,async(req,res)=>{
    const username = req.session.user.username;
  try {
    const todos = await todoModel.find({ username: username });
    console.log(todos);
    // return res.send({
    //   status:200,
    //   message:"Read success",
    //   data: todos
    // })
    return res.render("dashboard", { todos: todos });
  } catch (error) {
    return res.send(error);
  }
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
app.post('/create-item',isAuth,rateLimiting,async(req,res)=>{

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

//edit todo Route
app.post('/edit-item',isAuth,async(req,res)=>{
    //todoId and updated todo text from req
    const{id,newData} = req.body;

    //data validation
    if(!id || !newData){
        return res.send({
            status:400,
            message:"Please enter todoId and NewtodoText"
        });
    }

    if(newData.length < 3 || newData> 50){
        return res.send({
            status:400,
            message:"Todo text should be 3-50 characters"
        });
    }
  //find the todo in db
  try{
     const tododb = await todoModel.findById({_id:id});
     if(!tododb){
        return res.send({
            status:400,
            message:"Todo not found"
        });
     }

     //check ownership
     if(tododb.username !== req.session.user.username){
        return res.send({
            status:401,
            message:"You are not authorized to edit this todo"
        });
     }
     //update the todo
     const PrevTodo = await todoModel.findOneAndUpdate({_id:id},{todo:newData})
     return res.send({
        status:200,
        message:"Todo updated successfully",
        data:PrevTodo
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

//delete todo route
app.post("/delete-item", isAuth, async (req, res) => {
    //todoId
    const { id } = req.body;
  
    //data validation
  
    if (!id) {
      return res.send({
        status: 400,
        message: "Missing credentials",
      });
    }
  
    //find the todo from db
  
    try {
      const todoDb = await todoModel.findOne({ _id: id });
      if (!todoDb) {
        return res.send({
          status: 400,
          message: "Todo not found",
        });
      }
  
      //check ownership
      if (todoDb.username !== req.session.user.username) {
        return res.send({
          status: 401,
          message: "Not allowed to delete, authorization failed",
        });
      }
  
      //update the todo in DB
      const todoPrev = await todoModel.findOneAndDelete({ _id: id });
  
      return res.send({
        status: 200,
        message: "Todo deleted successfully",
        data: todoPrev,
      });
    } catch (error) {
      return res.send({
        status: 500,
        message: "Database error",
        error: error,
      });
    }
  });

//pagination route
app.get('/read-item',isAuth,rateLimiting,async(req,res)=>{
    const SKIP = req.query.skip || 0;
    const LIMIT =process.env.LIMIT;
    const username = req.session.user.username;
    try{
        const tododb = await todoModel.aggregate([
            //pagination  and match
            {
                $match : {username:username}
            },
            { 
                $facet:{
                    data:[{ $skip : parseInt(SKIP)},{ $limit : parseInt(LIMIT) }]
                }
            },
        ]);

        return res.send({
            status:200,
            message:"Read success",
            data:tododb[0].data
        });
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