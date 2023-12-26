const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    isEmailAuthenticated: {
        type: Boolean,
        require: true,
        default: false,
      },
    telephone: {
        type: String,
        required: false
    }

});

module.exports = mongoose.model('User', userSchema);