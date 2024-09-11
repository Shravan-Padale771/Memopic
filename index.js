import express from "express";
import env from "dotenv";
import multer from "multer";
import bodyParser from "body-parser";
import session from "express-session";
import flash from "connect-flash";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import pg from "pg";


const app = express();
const port = 3000;
const saltRounds = 10;

env.config();

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie :{
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );




app.use(bodyParser.urlencoded({extended:true}))
app.set('view engine', 'ejs');
app.use(express.static("public"))
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());



app.use(function(req, res, next) {
  res.locals.messages = req.flash(); // Now `messages` will be available in your templates
  next();
});

const upload = multer({storage:multer.memoryStorage()})

const db = new pg.Client({
    user : process.env.SERVER_USER,
    host : process.env.SERVER_HOST,
    database : process.env.SERVER_DATABASE,
    password : process.env.SERVER_PASSWORD,
    port : process.env.SERVER_PORT
})



db.connect();

    

app.get("/",(req,res)=>{
    res.render("index.ejs")
})

app.get("/signup",(req,res)=>{
    res.render("signup.ejs")
})

app.get("/login",(req,res)=>{
    res.render("login.ejs")
})

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/main",async (req,res)=>{
    if(req.isAuthenticated()){
        const email = req.user.username;
        const id = req.user.id;
        

        const result = await db.query("select * from users where username = $1",[email])
        const content = result.rows[0]

        const result2 = await db.query("select TO_CHAR(period, 'DD/MM/YYYY') AS formatted_date,title,image from album where user_id = $1;",[id])

        const album = result2.rows
      
      res.render("main.ejs", 
        { 
            content: content,
            album : album 
        }
    );
    }else{
        res.redirect('/login')
    }

})

app.get("/profile",async (req,res)=>{
    if(req.isAuthenticated()){

      const email = req.user.username;
        const id = req.user.id;
        

        const result = await db.query("select * from users where username = $1",[email])
        const content = result.rows[0]

        const result2 = await db.query("select TO_CHAR(period, 'DD/MM/YYYY') AS formatted_date,title from album where user_id = $1;",[id])

        const album = result2.rows
        let selectedCategories = ["Anniversary","Birthday","Special Moment","Festival","Others"]
        let arr = []

        

        for (const category of selectedCategories) {
          const queryResult = await db.query("SELECT image FROM album WHERE category = $1 AND user_id = $2", [category,id]);
          if (queryResult.rows.length > 0) {
              arr.push({
                  category: category,
                  images: queryResult.rows
              });
          }
      }


      res.render("profile.ejs", {
        profile: content, // Assuming 'content' is already defined
        album: album, // 'arr' now contains the images grouped by category
        arr:arr
    });
    }else{
        res.redirect("/");
    }
})

app.get("/:category", async(req,res)=>{
  if(req.isAuthenticated()){
  const email = req.user.username;
  const id = req.user.id;
  const category = req.params.category
        

  const result = await db.query("select * from users where username = $1",[email])
  const content = result.rows[0]
  

  const result2 = await db.query("select TO_CHAR(period, 'DD/MM/YYYY') AS formatted_date,title,image from album where user_id = $1 AND category = $2;",[id,category])

  const album = result2.rows 
  res.render("category.ejs",
    {
      content : content,
      album : album,
      category : category
    }
  )
}else{
  res.redirect("/login")
}
})




app.post("/update", upload.single("profile"), async (req,res)=>{
  if(req.isAuthenticated()){
    const user = req.user;
    const name = req.body.username;
    if(req.file){
    const image = req.file.buffer.toString("base64");
    await db.query("update users set profile = $1 where id = $2",[image,user.id]);

    }

    await db.query("update users set name = $1 where id = $2",[name,user.id]);

    res.redirect("/profile");
  }else{
    res.redirect("/")
  }


})
  


// app.post(
//     "/login",
//     passport.authenticate("local", {
//       successRedirect: "/main",
//       failureRedirect: "/login",
//     })
// );

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Invalid username or password'  // Flash message for failed login
}), function(req, res) {
  res.redirect('/main'); // On success, redirect to main page
});



app.post("/signup", upload.single("profile") ,async (req,res)=>{
    const image = req.file.buffer.toString("base64");
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
          email,
        ]);
    
        if (checkResult.rows.length > 0) {
          req.redirect("/login");
        } else {
          bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
              console.error("Error hashing password:", err);
            } else {
                const result = await db.query("insert into users(name,username,password,profile) values($1,$2,$3,$4) returning *",[username, email, hash, image]);

              const user = result.rows[0];
              
              req.login(user, (err) => {
                console.log("success");
                res.redirect("/main");
              });
            }
          });
        }
      } catch (err) {
        console.log(err);
      }

})

app.post("/upload", upload.single("image"), async(req,res)=>{
  if(req.isAuthenticated()){
    const user = req.user
   
    const image = req.file.buffer.toString("base64");
    const title = req.body.title;
    const date = req.body.date;
    const category = req.body.category;
    await db.query("insert into album(image,title,period,category,user_id) values($1,$2,$3,$4,$5)",[image,title,date,category,user.id])

  
    res.redirect("/main")
 
}else{
    res.redirect("/main")
}

})


app.post("/date",async (req,res)=>{
  if(req.isAuthenticated()){
    const email = req.user.username;
    const id = req.user.id;
    

    const result = await db.query("select * from users where username = $1",[email])
    const content = result.rows[0]
    const result2 = await db.query("select TO_CHAR(period, 'DD/MM/YYYY') AS formatted_date,title,image,category from album where user_id = $1 order by period asc;",[id])
    

    let order =[]
    result2.rows.forEach(item => {
        order.push(item)
        
    });
    res.render("main.ejs",
    {
        album : order,
        content : content
    }
   )
  }else{
    res.redirect("/main")
  }
       
});

   
app.post("/title",async (req,res)=>{
  if(req.isAuthenticated()){
    const email = req.user.username;
    const id = req.user.id;
    

    const result = await db.query("select * from users where username = $1",[email])
    const content = result.rows[0]
    const result2 = await db.query("select TO_CHAR(period, 'DD/MM/YYYY') AS formatted_date,title,image,category from album where user_id = $1  order by title asc ;",[id])

    let order =[]
    result2.rows.forEach(item => {
        order.push(item)
        
    });
    res.render("main.ejs",
    {
        album : order,
        content : content
    }
   )
  }else{
    res.redirect("/main")
  }
       
});


app.post("/category",async (req,res)=>{
  if(req.isAuthenticated()){
    const email = req.user.username;
    const id = req.user.id;
    

    const result = await db.query("select * from users where username = $1",[email])
    const content = result.rows[0]
    const result2 = await db.query("select TO_CHAR(period, 'DD/MM/YYYY') AS formatted_date,title,image,category from album where user_id = $1 order by category asc ;",[id])

    let order =[]
    result2.rows.forEach(item => {
        order.push(item)
        
    });
    res.render("main.ejs",
    {
        album : order,
        content : content
    }
   )
  }else{
    res.redirect("/main")
  }
       
   });



   passport.use(
    new Strategy(async function verify(email, password, cb) {
      try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [email]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              console.error("Error comparing passwords:", err);
              return cb(err);
            } else {
              if (valid) {
                return cb(null, user);
              } else {
                return cb(null, false, { message: "Incorrect password" });
              }
            }
          });
        } else {
          return cb(null, false, { message: "User not found" });
        }
      } catch (err) {
        console.log(err);
        return cb(err);
      }
    })
);
  
  


passport.serializeUser((user, cb) => {
    cb(null, user);
  });
  
passport.deserializeUser((user, cb) => {
    cb(null, user);
  });

  
 

app.listen(port,(req,res)=>{
    console.log("Server started....!")

})