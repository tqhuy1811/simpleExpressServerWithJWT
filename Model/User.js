var mongoose = require('mongoose');
var Schema = mongoose.Schema;


module.exports = mongoose.model('Users', new Schema({ 
    id:Number,
    name: String, 
    email: String,
    type:String 
}),'Users');