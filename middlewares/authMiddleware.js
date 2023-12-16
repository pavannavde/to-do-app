const isAuth = (req, res, next) => {
    if (req.session.isAuth) {
        next();
    } else {
        res.send({
            status: 401, 
            message: "Session has been expired,Please Login again"
        })
    }
}

 module.exports = { isAuth };