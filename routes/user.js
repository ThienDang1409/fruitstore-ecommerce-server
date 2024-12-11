const { User } = require('../models/user');
const { ImageUpload } = require('../models/imageUpload');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');

const multer = require('multer');
const fs = require("fs");
const { sendVerficationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } = require('../helper/mailtrap/emails');
const { triggerAsyncId } = require('async_hooks');

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret,
    secure: true
});

var imagesArr = [];

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
        //imagesArr.push(`${Date.now()}_${file.originalname}`)

    },
})


const upload = multer({ storage: storage })



router.post(`/upload`, upload.array("images"), async (req, res) => {
    imagesArr=[];

    try{
    
        for (let i = 0; i < req?.files?.length; i++) {

            const options = {
                use_filename: true,
                unique_filename: false,
                overwrite: false,
            };
    
            const img = await cloudinary.uploader.upload(req.files[i].path, options,
                function (error, result) {
                    imagesArr.push(result.secure_url);
                    fs.unlinkSync(`uploads/${req.files[i].filename}`);
                });
        }


        let imagesUploaded = new ImageUpload({
            images: imagesArr,
        });

        imagesUploaded = await imagesUploaded.save();
        return res.status(200).json(imagesArr);

       

    }catch(error){
        console.log(error);
    }


});


router.post(`/signup`, async (req, res) => {
    const { name, phone, email, password, isAdmin } = req.body;

     // Validation rules
    const phoneRegex = /^[0-9]{10}$/;
    const nameRegex = /^[\p{L}\s]+$/u;

    if (!name.match(nameRegex)) {
        return res.json({ status: "FAILED", msg: "Name should only contain letters!" });
    }

    if (!phone.match(phoneRegex)) {
        return res.json({ status: "FAILED", msg: "Phone number must be 10 digits and contain only numbers!" });
    }

    if (password.length < 6) {
        return res.json({ status: "FAILED", msg: "Password must be at least 6 characters long!" });
    }

    try {

        const existingUser = await User.findOne({ email: email });
        const existingUserByPh = await User.findOne({ phone: phone });

        if (existingUser) {
            res.json({status:'FAILED', msg: "User already exist with this email!" })
            return;
        }

        if (existingUserByPh) {
            res.json({status:'FAILED', msg: "User already exist with this phone number!" })
            return;
        }

        const hashPassword = await bcrypt.hash(password,10);
        const verificationToken = Math.floor(100000 +  Math.random() * 900000).toString()

        const result = await User.create({
            name:name,
            phone:phone,
            email:email,
            password:hashPassword,
            isAdmin:isAdmin,
            verificationToken: verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        const token = jwt.sign({email:result.email, id: result._id}, process.env.JSON_WEB_TOKEN_SECRET_KEY);

        await sendVerficationEmail(result.email, verificationToken)
        res.status(200).json({
            user:result,
            token:token,
            msg:"User Register Successfully"
        })

    } catch (error) {
        console.log(error);
        res.json({status:'FAILED', msg:"something went wrong"});
        return;
    }
})


router.post(`/signin`, async (req, res) => {
    const {email, password} = req.body;

    try{

        const existingUser = await User.findOne({ email: email });
        if(!existingUser){
            res.status(404).json({error:true, msg:"User not found!"})
            return;
        }
        if(!existingUser.isVerified) {
            res.status(400).json({error:true, msg:"Email is not verify!"})
            return;
        }
        const matchPassword = await bcrypt.compare(password, existingUser.password);
        // const matchPassword = password === existingUser.password;
        if(!matchPassword){
            return res.status(400).json({error:true,msg:"Invailid credentials"})
        }

        const token = jwt.sign({email:existingUser.email, id: existingUser._id}, process.env.JSON_WEB_TOKEN_SECRET_KEY);


       return res.status(200).send({
            user:existingUser,
            token:token,
            msg:"user Authenticated"
        })

    }catch (error) {
        res.status(500).json({error:true,msg:"something went wrong"});
        return;
    }

})

router.post(`/verify-email`, async(req, res) => {
    const {code} = req.body;
    try{
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: {$gt: Date.now()}
        })

        if(!user){
            return res.status(400).json({success: false, message: "Invalid or expired verification code"})
        }

        user.isVerified = true
        user.verificationToken = undefined
        user.verificationTokenExpiresAt = undefined

        await user.save()

        await sendWelcomeEmail(user.email, user.name)

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            user: {
                ...user._doc,
                password: undefined,
            }
        })
    }catch (error) {
        console.log("Error in verify-email", error);
        return res.status(500).json({status:'FAILED', msg:"something went wrong"});
    }
})

router.put(`/changePassword/:id`, async (req, res) => {
   try{
    const { email, password, newPass} = req.body;

   console.log(req.body)
   console.log(req.params.id)

    const existingUser = await User.findOne({ email: email });
    if(!existingUser){
        return res.status(400).send({error:true, status: 'FAILED', msg:"User not found!"})
    }
    
    const matchPassword = await bcrypt.compare(password, existingUser.password);

    if(!matchPassword){
        return res.status(400).json({error:true, status: 'FAILED', msg:"current password wrong"})
    }
    if (newPass.length < 6) {
        return res.status(400).json({ error:true, status: 'FAILED', msg: "Password must be at least 6 characters long!" });
    }
    const newPassword =  await bcrypt.hash(newPass,10);
    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            password:newPassword,
        },
        { new: true}
    )

    if(!user){
        return res.status(400).json({error:true,  status: 'FAILED', msg:'The user cannot be Updated!'})
    }
    return res.status(200).json({ error: false, status: 'SUCCESS', msg: "Password updated successfully!" });
    }catch(error){
        console.error(error);
        return res.status(500).json({ error: true, status: 'FAILED', msg: "Internal server error" });
    }
})

// Get post count (excluding child posts if needed)
router.get('/get/count', async (req, res) => {
    try {
        const userCount = await User.countDocuments({ parentId: undefined });
        return res.status(200).json({ success: true, userCount });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});


// Get all posts with pagination and optional location filter
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const locationFilter = req.query.location;

    try {
        const query = { isAdmin: false };
        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / perPage);

        if (page > totalUsers) {
            return res.status(404).json({ success: false, message: "Page not found" });
        }

        let users = [];

        if (locationFilter) {
            const allUsers = await User.find(query)
                .populate("name")
                .exec();

                users = allUsers.filter(user =>
                user.location && user.location.some(loc => loc.value === locationFilter)
            ).slice((page - 1) * perPage, page * perPage);
        } else {
            users = await User.find(query)
                .populate("name")
                .skip((page - 1) * perPage)
                .limit(perPage)
                .exec();
        }

        return res.status(200).json({
            success: true,
            data: users,
            totalUsers,
            currentPage: page,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async(req,res)=>{
    const user = await User.findById(req.params.id);

    if(!user) {
        res.status(500).json({ success: false, message: 'The user with the given ID was not found.' })
    } else{
        res.status(200).json({ success: true, data: user });
    }
    
})

router.delete('/:id', (req, res)=>{
    User.findByIdAndDelete(req.params.id).then(user =>{
        if(user) {
            return res.status(200).json({success: true, message: 'the user is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "user not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})


router.get(`/get/count`, async (req, res) =>{
    const userCount = await User.countDocuments()

    if(!userCount) {
        res.status(500).json({success: false})
    } 
    res.send({
        userCount: userCount
    });
})


router.post(`/authWithGoogle`, async (req, res) => {
    const {name, phone, email, password, images, isAdmin} = req.body;
    

    try{
        const existingUser = await User.findOne({ email: email });       

        if(!existingUser){
            const result = await User.create({
                name:name,
                phone:phone,
                email:email,
                password:password,
                images:images,
                isAdmin:isAdmin,
                isVerified: true,
            });

    
            const token = jwt.sign({email:result.email, id: result._id}, process.env.JSON_WEB_TOKEN_SECRET_KEY);

            return res.status(200).send({
                 user:result,
                 token:token,
                 msg:"User Login Successfully!"
             })
    
        }

        else{
            const existingUser = await User.findOne({ email: email });
            const token = jwt.sign({email:existingUser.email, id: existingUser._id}, process.env.JSON_WEB_TOKEN_SECRET_KEY);

            return res.status(200).send({
                 user:existingUser,
                 token:token,
                 msg:"User Login Successfully!"
             })
        }
      
    }catch(error){
        console.log(error)
    }
})


router.put('/:id',async (req, res)=> {

    const { name,  email,phone, images, isAdmin} = req.body;
    console.log(req.body)

    const userExist = await User.findById(req.params.id);
    const phoneRegex = /^[0-9]{10}$/;
    const nameRegex = /^[\p{L}\s]+$/u;

    if (!name.match(nameRegex)) {
        return res.json({ status: "FAILED", msg: "Name should only contain letters!" });
    }

    if (!phone.match(phoneRegex)) {
        return res.json({ status: "FAILED", msg: "Phone number must be 10 digits and contain only numbers!" });
    }
    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name:name,
            phone:phone,
            email:email,
            images: images,
            isAdmin: isAdmin,
        },
        { new: true}
    )

    if(!user)
        {return res.status(400).json({error: false, msg: 'the user cannot be Updated!'})}

    return res.status(200).json({ error: false, status: "SUCCESS" });;
})

router.post('/forgot-password', async (req, res) => {
    const {email} = req.body;
    try{
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({success: false, message: "User not found"})
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpireAt = Date.now() + 1*60*60*1000
        user.resetPasswordToken = resetToken
        user.resetPasswordExpiresAt = resetTokenExpireAt

        await user.save()

        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_BASE_URL}/reset-password/${resetToken}`)

        res.status(200).json({success: true, message: "Password reset link sent to your email"});
    } catch(error){
        console.log("Error in forgotPassword ", error)
        res.status(400).json({success: false, message: error.message})
    };
})

router.post('/reset-password/:token', async (req, res) => {
    try{
        const { token } = req.params;
        const { password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: {$gt: Date.now()},
        });
        
        if(!user){
            return res.status(400).json({success: false, message: "Invalid or expired reset token"})
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        
        await user.save();

        await sendResetSuccessEmail(user.email);
        res.status(200).json({success: true, message:"Password reset successful"})
    } catch(error){
        console.log("Error in resetPassword ", error);
        res.status(400).json({success: false, message: error.message});
    }
})

router.delete('/deleteImage', async (req, res) => {
    const imgUrl = req.query.img;

   // console.log(imgUrl)

    const urlArr = imgUrl.split('/');
    const image =  urlArr[urlArr.length-1];
  
    const imageName = image.split('.')[0];

    const response = await cloudinary.uploader.destroy(imageName, (error,result)=>{
       // console.log(error, res)
    })

    if(response){
        res.status(200).send(response);
    }
      
});

// Đếm số lượng đơn hàng theo trạng thái
router.get('/get/data/user-spent', async (req, res) => {
    try {
        const result = await User.aggregate([
            {
                $match: {
                  isAdmin: false // Lọc bỏ các tài khoản có vai trò 'admin'
                }
            },
            {
              $project: {
                name: 1, // Chỉ lấy trường 'name'
                totalSpent: 1, // Chỉ lấy trường 'totalSpent'
              }
            },
            {
              $sort: { totalSpent: -1 } // Sắp xếp theo totalSpent giảm dần
            },
            {
              $limit: 10 // Giới hạn kết quả để chỉ lấy 4 người dùng có chi tiêu cao nhất
            }
          ]);
  
  
      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching order status summary:", error.message);
      res.status(500).json({ success: false, message: "Internal Server Error." });
    }
  });
  

router.post(`/admin`, async (req, res) => {
    const {email, password} = req.body;

    try{

        const existingUser = await User.findOne({ email: email });
        if(!existingUser){
            res.status(404).json({error:true, msg:"User not found!"})
            return;
        }
        if(!existingUser.isVerified) {
            res.status(400).json({error:true, msg:"Email is not verify!"})
            return;
        }
        const matchPassword = await bcrypt.compare(password, existingUser.password);
        if(!matchPassword){
            return res.status(400).json({error:true,msg:"Invailid credentials"})
        }

        const token = jwt.sign({email:existingUser.email, id: existingUser._id}, process.env.JSON_WEB_TOKEN_SECRET_KEY);


       return res.status(200).send({
            user:existingUser,
            token:token,
            msg:"user Authenticated"
        })

    }catch (error) {
        res.status(500).json({error:true,msg:"something went wrong"});
        return;
    }


})

module.exports = router;