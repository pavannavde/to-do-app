const validator = require('validator');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const cleanUpAndValidate =({name,email,password,username})=>{

    return new Promise((resolve,reject)=>{

        if(!name || !email || !password || !username){
            reject("Credentials Missing");
        }
        if(typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof username !== 'string'){
            reject("Invalid Credentials");
        }

        if(username.length < 3 || username.length > 15){
            reject("Username should be of 3-15 chars");
        }
        if(password.length < 3 || password.length > 15){
            reject("Password should be of 3-15 chars");
        }
        if(!validator.isEmail(email)){
            reject("Invalid Email address");
        }
       
        resolve()
    });

}
const generateToken = (email) =>{
  const token = jwt.sign(email,process.env.SECRET_KEY);
  return token;

}
const sendVerificationMail =({email,verificationToken})=>{

    const transporter = nodemailer.createTransport({
        host :"smtp.gmail.com",
        port:465,
        secure:true,
        service :"gmail",
        auth:{
            user :"pavannavde1997@gmail.com" ,
            pass:"hcfz zoug qpfu gsbo"
        },
    });

   const mailOptions = {
    from :"pavannavde1997@gmail.com",
    to:email,
    subject:"Email Verification",
    html:`<h1>Please verify your email address to complete the signup and login into your account</h1>
    <p>Click on the link below to verify your email address</p>
    <a href="http://localhost:8000/verifytoken/${verificationToken}">Verify Email</a>`
   };
   
   transporter.sendMail(mailOptions,(error,info)=>{
    if(error){
        console.log(error);
    }else{
        console.log("Email sent: " + info.response);
    }
   });

}

module.exports = {cleanUpAndValidate,generateToken,sendVerificationMail};