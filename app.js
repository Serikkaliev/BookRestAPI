const express = require('express')
const path = require('path')
const app = express()
const port = 3000
const passport = require('passport')
const cookieParser = require("cookie-parser");

app.use(express.static(__dirname + '/public'));
// app.use(passport.initialize())
app.set('views',path.join(process.cwd(), 'views'));

// require('./public/javascripts/passport')(passport)
app.use(cookieParser());
app.set('view engine', 'ejs');

var indexRouter = require("./routes/index");
app.use('/',indexRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})


module.exports = app;
