
const validateToDo = (todoText) =>{

    return new Promise((resolve, reject) => {
        //if todText is empty
        if(!todoText){
            reject('Missing todo text');
        }
        //if todoText is not string
        if(typeof todoText !== 'string'){
            console.log(typeof todoText);
            reject('Todo text must be a string');
        }
        //if length of todoText is less than 3 or greater than 100
        if(todoText.length < 3 || todoText.length > 100){
            reject('Todo text must be between 3 and 100 characters')
        }
        resolve();
})
}


module.exports = {validateToDo};