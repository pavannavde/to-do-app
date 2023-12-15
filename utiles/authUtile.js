const validator = require('validator');

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

module.exports = {cleanUpAndValidate};