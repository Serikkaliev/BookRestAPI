var express = require('express');
const path = require('path')
const bodyParser = require('body-parser')
const https = require('https')
const axios = require('axios');
const { collection, Cars, Order} = require('../config');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')
const { cookieJwtAuth , isAdmin} = require("../public/javascripts/passport");
const multer = require('multer');

let Storage = multer.diskStorage({
    destination: 'public/carimg',
    filename: (req,file,cd)=>{
        cd(null,file.originalname)
    }
})

let upload = multer({
    storage: Storage
})



dotenv.config()

var router = express.Router();
router.use(express.json());
router.use(bodyParser.urlencoded({extended:true}))


router.get('/', function(req,res){
    res.render("signin")

});

router.get('/Cars',cookieJwtAuth, async function(req,res){
    const cars = await Cars.find({});
    res.render(path.join(__dirname, '..','/views/index'), {cars: cars});
});



router.get('/carPage/:id',cookieJwtAuth, async function(req,res){
    const car = await Cars.findById(req.params.id);
    console.log(car)
    res.render('carPage', {car:car})
})




router.get('/order',cookieJwtAuth,isAdmin, async function(req,res){
    const order = await Order.find({});
    res.render('orders', {orders : order})
})


router.post('/order/add/:id', cookieJwtAuth, async function(req, res) {
    const carId = req.params.id;
    try {
        const car = await Cars.findOne({ _id: carId });
        if (!car) {
            return res.status(404).send('Car not found');
        }
        // Assuming car.cost is a string like "10$", we need to remove non-numeric characters
        // Convert cost to a number after removing any non-numeric characters except for the decimal point
        const cost = parseFloat(car.cost.replace(/[^\d.]/g, ''));
        if (isNaN(cost)) {
            return res.status(400).send('Invalid cost value');
        }
        const newOrder = new Order({
            fullName: req.body.fillname,
            carId: carId,
            Price: cost, // Now it's a number
            orderDate: req.body.startDate,
            returnDate: req.body.endDate,
            deliveryAddress: req.body.address
        });
        await newOrder.save();
        // Redirect or send a success response
        res.send('Order added successfully');
    } catch (error) {
        console.error('Error adding order:', error);
        res.status(500).send('Internal server error');
    }
});


router.get("/signup",(req,res)=>{
    res.render("signin")
})


router.get("/signin",(req,res)=>{
    res.render("signin")
})


router.post("/signup",async(req,res) =>{
    const salt = bcrypt.genSaltSync(10)
    const username = req.body.sign_up_username;
    const password = bcrypt.hashSync(req.body.sign_up_password,salt)
    const password2 = req.body.sign_up_password2
    const time = new Date()
    const existingUser = await collection.findOne({name: username})
    if(existingUser){
        return res.render('signin');
    }
    if(!bcrypt.compareSync(password2,password)){
        return res.render('signin');
    }
    else{
    const data = new collection({
        name : username,
        password : password,
        creationDate: formattedDateTime(time)
    })
    const userdata = await data.save()
    console.log(userdata)
    res.redirect('/Cars');
}
})


router.post("/signin", async(req,res)=>{
    const username = req.body.sign_in_username;
    const password = req.body.sign_in_password;
    const check  = await collection.findOne({name: username});


     if(check){
        const passcheck = bcrypt.compareSync(password, check.password)
        console.log(passcheck)
        if(passcheck){
        const token = jwt.sign( {check} , "Sagi SE-2230", { expiresIn: "1h" });
        res.cookie("token", token);
        if(check.isAdmin == true){
        res.redirect('/admin')
        }
        else{
        res.redirect('/Cars')
        }

        }
        else{
            res.render("signin") //парольи не совпали
        }
    }
    else{
        res.render("signin")  // имени нету
    }

})

router.get('/admin',cookieJwtAuth, isAdmin ,async (req, res) => {
    try {
        const users = await collection.find({});
        res.render('admin',{users: users});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admincar' ,cookieJwtAuth, isAdmin ,async(req, res) => {
    try {
        const cars = await Cars.find({});
        res.render("admincar",{cars: cars});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

router.get('/admin/edit/:id',cookieJwtAuth, isAdmin, async (req, res) => {
    try {
        const user = await collection.findById(req.params.id);
        res.render('editUser', { user: user });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/admin/edit/:id', async (req, res) => {
    try {

        const check  = await collection.findOne({name: req.body.username});
        if(!check){
            res.redirect('/admin');
        }

        const currentDate = new Date();
        await collection.findByIdAndUpdate(req.params.id, {
            isAdmin: req.body.isAdmin,
            name: req.body.username,
            password: req.body.password,
            updateDate: formattedDateTime(currentDate)
        });
        res.redirect('/admin');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/admin/edit/car/:id', upload.array('photo',3 ), async (req, res) => {
    try {
            const url = `https://www.carqueryapi.com/api/0.3/?cmd=getTrims&year=${req.body.year}&make=${req.body.car_make}&model=${req.body.car_model}`;
            https.get(url, function(response){
                let data = '';
                response.on("data", function(chunk) {
                    data += chunk;
                });

                response.on("end", async function() {
                    try {
                        const Cardata = JSON.parse(data);
                        const cardata = Cardata.Trims[0]
                        const updatedCarData = {
                            img: req.files[0].filename,
                            img2:  req.files[1].filename,
                            img3:  req.files[2].filename,
                            Model: req.body.car_model,
                            Make: req.body.car_make ,
                            Year: req.body.year,
                            Engine_position: cardata.model_engine_position,
                            Power: cardata.model_engine_power_ps,
                            Drive: cardata.model_drive,
                            Transmission: cardata.model_transmission_type,
                            weight: cardata.model_weight_kg,
                            country: cardata.make_country,
                            body: cardata.model_body,
                            configuration: req.body.configuration,
                            seats: cardata.model_seats,
                            fuel_cap: cardata.model_fuel_cap_l,
                            trim: cardata.model_trim,
                            cost: req.body.Cost,
                            description_in_en: req.body.description_en,
                            description_in_rus: req.body.description_rus,
                        }
                        await Cars.findByIdAndUpdate(req.params.id, updatedCarData)
                    }
                    catch(e){
                        console.log(e)
                    }
                })
            })
    }
    catch(e){
        console.log(e)
    }
});


router.get('/admin/delete/:id',cookieJwtAuth, isAdmin, async (req, res) => {
    try {
        console.log(req.params.id)
        const currentDate = new Date();
        await collection.findByIdAndUpdate(req.params.id, {
            deletionDate: formattedDateTime(currentDate)
        });
        res.redirect('/admin');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin/delete/car/:id',cookieJwtAuth, isAdmin, async (req, res) => {
    try {
        await Cars.findByIdAndDelete(req.params.id)
        res.redirect('/admincar');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/admin/delete/order/:id',cookieJwtAuth, isAdmin, async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id)
        res.redirect('/order');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/admin/add/car',upload.array('photo',3 ), async (req, res) => {
    const { year, make, model ,configuration,Cost,description_en,description_rus} = req.body;
    const url = `https://www.carqueryapi.com/api/0.3/?cmd=getTrims&year=${year}&make=${make}&model=${model}`;
    https.get(url, function(response) {
        let data = '';

        response.on("data", function(chunk) {
            data += chunk;
        });

        response.on("end", async function() {
            try {
                const Cardata = JSON.parse(data);
                const cardata = Cardata.Trims[0];
                console.log(cardata)
                const newCar = new Cars({
                    img: req.files[0].filename,
                    img2:  req.files[1].filename,
                    img3:  req.files[2].filename,
                    Model: model,
                    Make: make,
                    Year: year,
                    configuration: configuration,
                    cost: Cost,
                    description_in_en: description_en,
                    description_in_rus: description_rus,
                })
                await newCar.save();
                res.redirect('/admincar',);
            } catch (error) {
                console.error("Ошибка при парсинге JSON:", error);
                res.status(500).send("Ошибка сервера");
            }
        });
    }).on("error", function(error) {
        console.error("Ошибка при запросе к API:", error);
        res.status(500).send("Ошибка сервера");
    });
});



router.post('/admin/add', async (req, res) => {
    try {
    let isAdmin = false
    if(req.body.isAdmin == "on"){
        isAdmin = true
    }
    console.log(isAdmin)
    const time = new Date()
        const newUser = new collection({
            isAdmin: isAdmin,
            name: req.body.username,
            password: req.body.password,
            creationDate: formattedDateTime(time)
        });
        await newUser.save();
        res.redirect('/admin',);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

function formattedDateTime(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}


module.exports = router;