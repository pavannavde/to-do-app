const accessModel =require('../models/accessModel');

const rateLimiting = async (req, res, next) => {
    const sessionId=req.session.id;

    //check if person is making req for the first time
    try{
        const accessdb = await accessModel.findOne({sessionId:sessionId});
        //if accessdb is null, person is making req for the first time
        if(!accessdb){
            const accessObj = new accessModel({
                sessionId:sessionId,
                time:Date.now(),
            });
            await accessObj.save();
            next();
            return;
        }
        //if accessdb is not null, person is not making req for the first time
        //compare time difference
        const timeDiff = (Date.now() - accessdb.time)/1000;
        if(timeDiff < 3){
            return res.send({
                status:400,
                message:"Too many requests"
            });
        }
        //if time difference is greater than 3, update time and continue
        
        await accessModel.findOneAndUpdate({sessionId:sessionId},{time:Date.now()});
        //allow user to hit api
        next(); 
    }
    catch(err){
        return res.send({
            status:500,
            message:"Database error",
            error:err
        });
    }
}

module.exports = rateLimiting;